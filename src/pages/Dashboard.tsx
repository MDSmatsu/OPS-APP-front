
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'

async function fetchSummary() {
  const { data: wo } = await supabase.from('v_wo_status').select('status,qty_plan,good_total')
  const { data: inv } = await supabase.from('v_item_balance').select('item_id,sku,on_hand').limit(10)
  const { data: st } = await supabase.from('stocktakes').select('id,status').eq('status','COUNTING')
  return { wo: wo || [], inv: inv || [], st: st || [] }
}

export default function Dashboard(){
  const { data } = useQuery({ queryKey:['dashboard'], queryFn: fetchSummary })
  const woOpen = (data?.wo || []).filter((w:any)=>w.status !== 'DONE' && w.status !== 'CLOSED')
  const woLate = woOpen // 遅延判定は後で due_date 追加して強化

  return (
    <div className="card">
      <h2>Dashboard</h2>
      <div className="grid grid-3">
        <div>
          <h3>未完了指示</h3>
          <p>{woOpen.length} 件</p>
        </div>
        <div>
          <h3>棚卸進行中</h3>
          <p>{data?.st.length ?? 0} 件</p>
        </div>
        <div>
          <h3>在庫（サンプル10件）</h3>
          <ul>
            {(data?.inv || []).map((r:any)=>(
              <li key={r.item_id}>{r.sku}: {r.on_hand}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
