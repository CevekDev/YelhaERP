import { NextRequest, NextResponse } from 'next/server'
import { SUB_API_DOCS_MARKDOWN, SUB_API_DOCS_VERSION } from '@/lib/sub-api/docs'

export const dynamic = 'force-static'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const download = searchParams.get('download') === '1'

  const headers: Record<string, string> = {
    'Content-Type':  'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
    'X-Docs-Version': SUB_API_DOCS_VERSION,
  }
  if (download) {
    headers['Content-Disposition'] = 'attachment; filename="yelhasubs-sub-api-docs.md"'
  }

  return new NextResponse(SUB_API_DOCS_MARKDOWN, { status: 200, headers })
}
