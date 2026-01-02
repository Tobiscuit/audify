import { TextractClient, AnalyzeDocumentCommand, FeatureType, Block, BlockType } from '@aws-sdk/client-textract';

let _textractClient: TextractClient | null = null;

function getTextractClient(): TextractClient {
  if (!_textractClient) {
    _textractClient = new TextractClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _textractClient;
}

export interface ExtractedSection {
  title: string;
  level: number;
  content: string;
  charCount: number;
}

interface LayoutBlock {
  type: string;
  text: string;
  confidence: number;
}

// Extract text and layout from PDF using Textract
export async function extractFromPDFWithTextract(pdfBuffer: Buffer): Promise<{
  text: string;
  sections: ExtractedSection[];
}> {
  const client = getTextractClient();

  const command = new AnalyzeDocumentCommand({
    Document: {
      Bytes: pdfBuffer,
    },
    FeatureTypes: [FeatureType.LAYOUT],
  });

  const response = await client.send(command);
  const blocks = response.Blocks || [];

  // Build text from LINE blocks
  const lineBlocks = blocks
    .filter((b): b is Block & { Text: string } => 
      b.BlockType === BlockType.LINE && !!b.Text
    )
    .sort((a, b) => {
      const pageA = a.Page || 1;
      const pageB = b.Page || 1;
      if (pageA !== pageB) return pageA - pageB;
      const topA = a.Geometry?.BoundingBox?.Top || 0;
      const topB = b.Geometry?.BoundingBox?.Top || 0;
      return topA - topB;
    });

  const fullText = lineBlocks.map(b => b.Text).join('\n');

  // Extract layout elements (titles, headers, etc.)
  const layoutBlocks: LayoutBlock[] = blocks
    .filter((b): b is Block & { Text: string } => 
      !!b.Text && 
      ['LAYOUT_TITLE', 'LAYOUT_SECTION_HEADER', 'LAYOUT_HEADER'].includes(b.BlockType as string)
    )
    .map(b => ({
      type: b.BlockType as string,
      text: b.Text,
      confidence: b.Confidence || 0,
    }));

  // Convert layout blocks to sections
  const sections: ExtractedSection[] = [];
  
  if (layoutBlocks.length === 0) {
    // No layout detected - return full document
    sections.push({
      title: 'Full Document',
      level: 1,
      content: fullText,
      charCount: fullText.length,
    });
  } else {
    // Find text between each layout header
    let currentIndex = 0;
    
    for (let i = 0; i < layoutBlocks.length; i++) {
      const block = layoutBlocks[i];
      const headerIndex = fullText.indexOf(block.text, currentIndex);
      
      if (headerIndex === -1) continue;
      
      // Determine next boundary
      const nextBlock = layoutBlocks[i + 1];
      let endIndex = fullText.length;
      
      if (nextBlock) {
        const nextIndex = fullText.indexOf(nextBlock.text, headerIndex + block.text.length);
        if (nextIndex !== -1) endIndex = nextIndex;
      }
      
      const content = fullText.slice(headerIndex, endIndex).trim();
      
      sections.push({
        title: block.text.slice(0, 60),
        level: block.type === 'LAYOUT_TITLE' ? 1 : block.type === 'LAYOUT_SECTION_HEADER' ? 2 : 1,
        content,
        charCount: content.length,
      });
      
      currentIndex = endIndex;
    }
    
    // If no sections were created, use full document
    if (sections.length === 0) {
      sections.push({
        title: 'Full Document',
        level: 1,
        content: fullText,
        charCount: fullText.length,
      });
    }
  }

  return { text: fullText, sections };
}

// Simple text extraction (fallback for non-Textract)
// Uses unpdf - serverless-compatible with zero native dependencies
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  // Convert Buffer to Uint8Array and load PDF
  const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
  // Extract text with pages merged
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
