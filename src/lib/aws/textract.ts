import { 
  TextractClient, 
  StartDocumentAnalysisCommand, 
  GetDocumentAnalysisCommand, 
  GetDocumentAnalysisCommandOutput,
  FeatureType, 
  Block, 
  BlockType
} from '@aws-sdk/client-textract';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

let _textractClient: TextractClient | null = null;
let _s3Client: S3Client | null = null;

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

function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3Client;
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

// Helper to poll for job completion
async function waitForTextractJob(jobId: string): Promise<Block[]> {
  const client = getTextractClient();
  let status = 'IN_PROGRESS';
  let blocks: Block[] = [];
  let nextToken: string | undefined;

  // Poll every 1 second, timeout after 60 seconds
  const maxRetries = 60;
  let retries = 0;

  console.log(`Polling Textract Job: ${jobId}`);

  while (status === 'IN_PROGRESS' && retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    retries++;

    const command: GetDocumentAnalysisCommand = new GetDocumentAnalysisCommand({ JobId: jobId, MaxResults: 1000, NextToken: nextToken });
    const response = await client.send(command) as GetDocumentAnalysisCommandOutput;
    status = response.JobStatus || 'FAILED';

    if (status === 'SUCCEEDED') {
      blocks.push(...(response.Blocks || []));
      
      // Handle pagination for results
      if (response.NextToken) {
          let paginationToken: string | undefined = response.NextToken;
          while (paginationToken) {
               const pageCmd: GetDocumentAnalysisCommand = new GetDocumentAnalysisCommand({ JobId: jobId, MaxResults: 1000, NextToken: paginationToken });
               const pageRes = await client.send(pageCmd) as GetDocumentAnalysisCommandOutput;
               blocks.push(...(pageRes.Blocks || []));
               paginationToken = pageRes.NextToken;
          }
      }
    } else if (status === 'FAILED') {
      throw new Error(`Textract job failed: ${response.StatusMessage}`);
    }
  }

  if (status !== 'SUCCEEDED') {
    throw new Error('Textract job timed out');
  }

  return blocks;
}

// Extract text and layout from PDF using Textract (Async S3 pipeline)
export async function extractFromPDFWithTextract(pdfBuffer: Buffer): Promise<{
  text: string;
  sections: ExtractedSection[];
}> {
  const textract = getTextractClient();
  const s3 = getS3Client();
  
  // 1. Upload PDF to temp S3 location
  // Use a dedicated bucket for uploads or the same output bucket
  const bucketName = 'jrami-universal-polly-output'; // We know this exists from debugging
  const fileKey = `temp-uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
  const kmsKeyId = process.env.AWS_KMS_KEY_ID;

  try {
    await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ServerSideEncryption: kmsKeyId ? 'aws:kms' : 'AES256',
        ...(kmsKeyId && { SSEKMSKeyId: kmsKeyId })
    }));
    
    // 2. Start Async Analysis
    const startCommand = new StartDocumentAnalysisCommand({
        DocumentLocation: {
            S3Object: {
                Bucket: bucketName,
                Name: fileKey
            }
        },
        FeatureTypes: [FeatureType.LAYOUT]
    });

    const startResponse = await textract.send(startCommand);
    const jobId = startResponse.JobId;

    if (!jobId) throw new Error('Failed to start Textract job');

    // 3. Poll for results
    const blocks = await waitForTextractJob(jobId);

    // 4. Cleanup S3
    // Don't await cleanup to speed up response
    s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: fileKey })).catch(console.error);

    // 5. Parse Blocks (Existing Logic)
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
        sections.push({
        title: 'Full Document',
        level: 1,
        content: fullText,
        charCount: fullText.length,
        });
    } else {
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

  } catch (error) {
    console.error('Textract Pipeline Error:', error);
    throw error;
  }
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
