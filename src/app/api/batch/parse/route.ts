import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const text = await file.text();

    if (!text.trim()) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    let sections: FlatSection[];

    if (useAI) {
      // TODO: Implement Nova 2 Lite AI detection
      // For now, fall back to regex
      sections = detectHierarchicalSections(text);
    } else {
      sections = detectHierarchicalSections(text);
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
