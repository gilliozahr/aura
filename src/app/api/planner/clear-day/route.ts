import { NextRequest, NextResponse } from 'next/server';
import { createAuraServerClient } from '@/lib/supabase/server';

interface RequestBody {
  planDate: string;
}

export async function DELETE(request: NextRequest) {
  console.log('[planner/clear-day] start');
  try {
    const supabase = await createAuraServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = (await request.json()) as RequestBody;
    const { planDate } = body;

    if (!planDate) {
      return NextResponse.json({ error: 'planDate is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('outfit_plans')
      .delete()
      .eq('user_id', user.id)
      .eq('plan_date', planDate);

    if (error) {
      console.error('[planner/clear-day] db error:', error.message);
      return NextResponse.json({ error: 'Failed to clear outfit plan.' }, { status: 500 });
    }

    console.log('[planner/clear-day] cleared', { planDate });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[planner/clear-day] error:', message);
    return NextResponse.json({ error: 'Failed to clear outfit plan.' }, { status: 500 });
  }
}
