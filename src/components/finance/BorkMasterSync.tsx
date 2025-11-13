import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, Database, CheckCircle, XCircle, Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface MasterDataStatus {
  product_groups: { count: number; last_sync: string | null }
  payment_methods: { count: number; last_sync: string | null }
  cost_centers: { count: number; last_sync: string | null }
  users: { count: number; last_sync: string | null }
}

interface SyncResult {
  success: boolean
  message: string
  timestamp: string
  details?: any
}

export function BorkMasterSync() {
  const [status, setStatus] = useState<MasterDataStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)

  const loadStatus = async () => {
    try {
      const { data: productGroups } = await supabase
        .from('bork_product_groups')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)

      const { data: paymentMethods } = await supabase
        .from('bork_payment_methods')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)

      const { data: costCenters } = await supabase
        .from('bork_cost_centers')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)

      const { data: users } = await supabase
        .from('bork_users')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)

      setStatus({
        product_groups: { 
          count: productGroups?.length || 0, 
          last_sync: productGroups?.[0]?.updated_at 
        },
        payment_methods: { 
          count: paymentMethods?.length || 0, 
          last_sync: paymentMethods?.[0]?.updated_at 
        },
        cost_centers: { 
          count: costCenters?.length || 0, 
          last_sync: costCenters?.[0]?.updated_at 
        },
        users: { 
          count: users?.length || 0, 
          last_sync: users?.[0]?.updated_at 
        }
      })
    } catch (error) {
      console.error('Error loading master data status:', error)
    }
  }

  const syncMasterData = async () => {
    setLoading(true)
    setLastSyncResult(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('bork-sync-master-data', {
        body: {
          location_ids: [
            '550e8400-e29b-41d4-a716-446655440001', // Bar Bea
            '550e8400-e29b-41d4-a716-446655440002', // L'Amour Toujours  
            '550e8400-e29b-41d4-a716-446655440003'  // Van Kinsbergen
          ]
        }
      })

      if (error) throw error

      setLastSyncResult({
        success: true,
        message: 'Master data sync completed successfully',
        timestamp: new Date().toISOString(),
        details: data
      })

      await loadStatus()
    } catch (error) {
      setLastSyncResult({
        success: false,
        message: `Sync failed: ${error.message}`,
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never'
    const date = new Date(lastSync)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  const getSyncStatus = (lastSync: string | null) => {
    if (!lastSync) return { status: 'never', color: 'secondary' as const }
    
    const date = new Date(lastSync)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays > 7) return { status: 'stale', color: 'destructive' as const }
    if (diffDays > 1) return { status: 'old', color: 'secondary' as const }
    return { status: 'fresh', color: 'default' as const }
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Master Data Status
          </CardTitle>
          <CardDescription>
            Reference data from Bork API. Sync when needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'product_groups', name: 'Product Groups', count: status.product_groups.count, lastSync: status.product_groups.last_sync },
                { key: 'payment_methods', name: 'Payment Methods', count: status.payment_methods.count, lastSync: status.payment_methods.last_sync },
                { key: 'cost_centers', name: 'Cost Centers', count: status.cost_centers.count, lastSync: status.cost_centers.last_sync },
                { key: 'users', name: 'Users', count: status.users.count, lastSync: status.users.last_sync }
              ].map((item) => {
                const syncInfo = getSyncStatus(item.lastSync)
                return (
                  <div key={item.key} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant={syncInfo.color}>
                        {syncInfo.status === 'never' ? 'Never' : 
                         syncInfo.status === 'stale' ? 'Stale' :
                         syncInfo.status === 'old' ? 'Old' : 'Fresh'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.count} items • {formatLastSync(item.lastSync)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Master Data</CardTitle>
          <CardDescription>
            Update all reference data from Bork API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={syncMasterData}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing...' : 'Sync All Master Data'}
          </Button>

          {lastSyncResult && (
            <Alert className={lastSyncResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {lastSyncResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <div>
                  <div className="font-medium">
                    {lastSyncResult.success ? 'Sync Successful' : 'Sync Failed'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(lastSyncResult.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <AlertDescription className="mt-2">
                {lastSyncResult.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

