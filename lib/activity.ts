import { createClient } from '@/lib/supabase/server'
import type { ActivityLog } from '@/types'

export type LogActivityInput = {
  entityType: ActivityLog['entity_type']
  entityId: string
  action: ActivityLog['action']
  description: string
  details?: Record<string, unknown>
}

/**
 * Record an activity entry in the activity_log table
 */
export async function logActivity({
  entityType,
  entityId,
  action,
  description,
  details,
}: LogActivityInput): Promise<void> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('activity_log').insert({
      user_id: user?.id ?? null,
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      description: description,
      details: details ?? null,
    })
  } catch (err) {
    console.error('Failed to log activity:', err)
  }
}

/**
 * Get recent activity log entries for feed
 */
export async function getRecentActivities(limit: number = 10): Promise<ActivityLog[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data as unknown as ActivityLog[]) ?? []
  } catch (err) {
    console.error('Failed to fetch recent activities:', err)
    return []
  }
}
