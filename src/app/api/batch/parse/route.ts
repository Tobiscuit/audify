import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractFromPDFWithTextract, extractTextFromPDF } from '@/lib/aws/textract';

interface HierarchicalSection {
  id: number;
  title: string;
  level: number;
  startIndex: number;
  endIndex: number;
  content: string;
  charCount: number;
  children: HierarchicalSection[];
}

interface FlatSection {
  id: number;
  title: string;
  level: number;
  charCount: number;
  preview: string;
  content: string;
}

// Detect heading level from markdown headings
function getHeadingLevel(line: string): { level: number; title: string } | null {
  // Markdown headings: # = 1, ## = 2, etc.
  const mdMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (mdMatch) {
    return { level: mdMatch[1].length, title: mdMatch[2].trim() };
  }

  // Numbered sections: 1. = level 1, 1.1 = level 2, 1.1.1 = level 3
  const numMatch = line.match(/^(\d+(?:\.\d+)*)\.\s+(.+)$/);
  if (numMatch) {
    const level = numMatch[1].split('.').length;
    return { level, title: `${numMatch[1]}. ${numMatch[2].trim()}` };
  }

  // Chapter/Module/Part keywords = level 1
  if (/^(Chapter|Part|Module|Unit)\s+\d+/i.test(line)) {
    return { level: 1, title: line.trim().slice(0, 60) };
  }

  // Section/Lesson = level 2
  if (/^(Section|Lesson)\s+\d+/i.test(line)) {
    return { level: 2, title: line.trim().slice(0, 60) };
  }

  // Roman numerals = level 1
  if (/^[IVX]+\.\s+/i.test(line)) {
    return { level: 1, title: line.trim().slice(0, 60) };
  }

  return null;
}

function detectHierarchicalSections(text: string): FlatSection[] {
  const lines = text.split('\n');
  const sections: FlatSection[] = [];
  let currentSection: { level: number; title: string; startLine: number; startIndex: number } | null = null;
  let charIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = getHeadingLevel(line);

    if (heading) {
      // Close previous section
      if (currentSection) {
        const endIndex = charIndex;
        const content = text.slice(currentSection.startIndex, endIndex).trim();
        sections.push({
          id: sections.length,
          title: currentSection.title,
          level: currentSection.level,
          charCount: content.length,
          preview: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
          content,
        });
      }

      // Start new section
      currentSection = {
        level: heading.level,
        title: heading.title,
        startLine: i,
        startIndex: charIndex,
      };
    }

    charIndex += line.length + 1; // +1 for newline
  }

  // Close last section
  if (currentSection) {
    const content = text.slice(currentSection.startIndex).trim();
    sections.push({
      id: sections.length,
      title: currentSection.title,
      level: currentSection.level,
      charCount: content.length,
      preview: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
      content,
    });
  }

  // If no sections found, return entire document
  if (sections.length === 0) {
    return [{
      id: 0,
      title: 'Full Document',
      level: 1,
      charCount: text.length,
      preview: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
      content: text,
    }];
  }

  return sections;
}

// Split long sections at sentence boundaries
function splitAtSentences(section: FlatSection, maxChars: number = 3000): FlatSection[] {
  if (section.charCount <= maxChars) return [section];

  const text = section.content;
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
  const chunks: FlatSection[] = [];
  let current = '';
  let partNum = 1;

  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current.length > 0) {
      chunks.push({
        id: section.id * 100 + partNum,
        title: `${section.title} (Part ${partNum})`,
        level: section.level,
        charCount: current.trim().length,
        preview: current.trim().slice(0, 100) + '...',
        content: current.trim(),
      });
      current = sentence;
      partNum++;
    } else {
      current += sentence;
    }
  }

  if (current.trim()) {
    chunks.push({
      id: section.id * 100 + partNum,
      title: chunks.length > 0 ? `${section.title} (Part ${partNum})` : section.title,
      level: section.level,
      charCount: current.trim().length,
      preview: current.trim().slice(0, 100) + (current.length > 100 ? '...' : ''),
      content: current.trim(),
    });
  }

  return chunks;
}

// Build tree structure from flat sections
function buildTree(sections: FlatSection[]): HierarchicalSection[] {
  const result: HierarchicalSection[] = [];
  const stack: HierarchicalSection[] = [];

  for (const section of sections) {
    const node: HierarchicalSection = {
      id: section.id,
      title: section.title,
      level: section.level,
      startIndex: 0,
      endIndex: 0,
      content: section.content,
      charCount: section.charCount,
      children: [],
    };

    // Find parent
    while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      result.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const maxChars = parseInt(formData.get('maxChars') as string) || 3000;
    const useAI = formData.get('useAI') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith('.pdf');
    const isDOCX = fileName.endsWith('.docx');
    const isEPUB = fileName.endsWith('.epub');
    let text: string;
    let sections: FlatSection[];
    let warning: string | null = null;

    if (isPDF) {
      // Handle PDF files
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (useAI) {
        // AI MODE GUARDRAILS
        // 1. Get Page Count (Cheap/Free Local Check)
        // using a helper or dynamic import of unpdf
        const { getDocumentProxy } = await import('unpdf');
        const pdfProxy = await getDocumentProxy(new Uint8Array(buffer));
        const pageCount = pdfProxy.numPages;

        // 2. Calculate Cost (10 credits per page)
        const COST_PER_PAGE = 10;
        const totalCost = pageCount * COST_PER_PAGE;

        // 3. Check User Balance & Settings
        const { data: userData } = await supabase
            .from('users')
            .select('credits, auto_approve_textract')
            .eq('id', user.id)
            .single();

        if (!userData) throw new Error('User not found');

        const canAfford = (userData.credits || 0) >= totalCost;
        const force = formData.get('force') === 'true'; // Client confirmation flag

        // 4. Gate Logic
        if (!canAfford) {
            return NextResponse.json({ 
                error: 'Insufficient credits',
                details: {
                    required: totalCost,
                    balance: userData.credits || 0,
                    pages: pageCount
                }
            }, { status: 402 }); // Payment Required
        }

        // If not auto-approved AND not forced by client -> Ask for permission
        if (!userData.auto_approve_textract && !force) {
             return NextResponse.json({
                requiresConfirmation: true,
                cost: totalCost,
                pages: pageCount,
                message: `This document is ${pageCount} pages. AI Enhanced Mode costs ${totalCost} credits.`
            }, { status: 402 }); // Use 402 as "Confirmation Needed" signal
        }

        // 5. Deduct Credits (if proceeding)
        if (totalCost > 0) {
             const { error: deductError } = await supabase.rpc('deduct_credits', {
                amount: totalCost,
                user_id: user.id
             });
             
             if (deductError) {
                 // Fallback if RPC missing or fails
                 await supabase
                    .from('users')
                    .update({ credits: (userData.credits || 0) - totalCost })
                    .eq('id', user.id);
             }
        }

        // 6. Use Textract (Expensive Cloud Call)
        try {
          const result = await extractFromPDFWithTextract(buffer);
          text = result.text;
          // Convert Textract sections to FlatSection format
          sections = result.sections.map((s, i) => ({
            id: i,
            title: s.title,
            level: s.level,
            charCount: s.charCount,
            preview: s.content.slice(0, 100) + (s.content.length > 100 ? '...' : ''),
            content: s.content,
          }));
        } catch (textractError) {
          console.error('Textract error, falling back to pdf-parse:', textractError);
          warning = 'AI detection failed for this PDF format. Credits refunded.';
          // Refund credits on failure
          await supabase.rpc('add_credits', { amount: totalCost, user_id: user.id });

          // Fall back to pdf-parse
          text = await extractTextFromPDF(buffer);
          sections = detectHierarchicalSections(text);
        }
      } else {
        // Use pdf-parse for free mode
        text = await extractTextFromPDF(buffer);
        sections = detectHierarchicalSections(text);
      }
    } else if (isDOCX) {
      // Handle DOCX files
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mammoth = await import('mammoth');
      
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
      
      if (result.messages && result.messages.length > 0) {
        console.warn('Mammoth warnings:', result.messages);
      }
      
      sections = detectHierarchicalSections(text);
    } else if (isEPUB) {
      // Handle EPUB files
      // epub2 requires a file path, so we need to write to tmp first
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      const EPub = await import('epub2').then(m => m.EPub);
      
      const tmpPath = path.join(os.tmpdir(), `upload-${Date.now()}.epub`);
      fs.writeFileSync(tmpPath, buffer);
      
      try {
        const epub = await EPub.createAsync(tmpPath);
        let fullText = '';
        
        // Extract text from each chapter
        // Note: epub2 returns HTML content, so we need to strip tags
        // For simplicity, we'll try to get text or use flow
        
        // Wait, epub2 gives us access to chapter text but might be HTML.
        // A simple regex strip is often enough for TTS feeding if we want raw text.
        
        // Let's iterate over flow/spine
        for (const chapterId of epub.flow) {
            const chap = await epub.getChapterAsync(chapterId);
            // Simple HTML tag stripper
            const chapText = chap.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            fullText += chapText + '\n\n';
        }
        
        text = fullText;
      } finally {
        // Cleanup
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      }
      
      sections = detectHierarchicalSections(text);
    } else {
      // Handle text files (.txt, .md)
      text = await file.text();

      if (!text.trim()) {
        return NextResponse.json({ error: 'File is empty' }, { status: 400 });
      }

      sections = detectHierarchicalSections(text);
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 });
    }

    // Split any sections that exceed maxChars
    const finalSections: FlatSection[] = [];
    for (const section of sections) {
      const split = splitAtSentences(section, maxChars);
      finalSections.push(...split);
    }

    // Build tree structure for UI
    const tree = buildTree(finalSections);

    return NextResponse.json({
      fileName: file.name,
      totalChars: text.length,
      mode: useAI ? 'ai' : 'regex',
      warning,
      sections: finalSections.map(s => ({
        id: s.id,
        title: s.title,
        level: s.level,
        charCount: s.charCount,
        preview: s.preview,
      })),
      tree,
      rawSections: finalSections,
    });
  } catch (error) {
    console.error('Batch parse error:', error);
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
