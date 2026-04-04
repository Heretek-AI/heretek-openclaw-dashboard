import { NextRequest, NextResponse } from 'next/server'

/**
 * Get skills from external plugin API
 * Returns unavailable error if no API configured
 */
async function getSkills() {
  const pluginUrl = process.env.PLUGIN_URL;
  const apiKey = process.env.PLUGIN_API_KEY;
  
  if (!pluginUrl) {
    throw new Error('PLUGIN_URL not configured');
  }
  
  const headers = apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {};
  const response = await fetch(`${pluginUrl}/skills`, { headers });
  
  if (!response.ok) {
    throw new Error(`Plugin API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.skills || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    
    // AUDIT-FIX: Replace mock with actual Plugin API call
    try {
      const skills = await getSkills();
      
      let results = skills;
      if (category) {
        results = results.filter((s: any) => s.category.toLowerCase() === category.toLowerCase());
      }
      
      return NextResponse.json({ skills: results });
    } catch (apiError) {
      // Return clear error instead of mock fallback
      return NextResponse.json(
        { 
          error: 'Skills API unavailable',
          details: apiError instanceof Error ? apiError.message : 'Unknown error',
          skills: [],
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Failed to fetch skills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // AUDIT-FIX: Replace mock with actual Plugin API call
    const pluginUrl = process.env.PLUGIN_URL;
    if (!pluginUrl) {
      return NextResponse.json(
        { error: 'Plugin API not configured' },
        { status: 503 }
      );
    }
    
    const apiKey = process.env.PLUGIN_API_KEY;
    const headers = apiKey ? { 
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    } : { 'Content-Type': 'application/json' };
    
    const response = await fetch(`${pluginUrl}/skills`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Plugin API error: ${response.status}` },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    return NextResponse.json({
      success: true,
      message: 'Skill installation initiated',
      ...result,
    });
  } catch (error) {
    console.error('Failed to install skill:', error)
    return NextResponse.json(
      { error: 'Failed to install skill' },
      { status: 500 }
    )
  }
}
