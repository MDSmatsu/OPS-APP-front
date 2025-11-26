
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { FUNCTIONS_BASE } from '../config'
import jsPDF from 'jspdf'

async function fetchWorkOrders(){
  const { data, error } = await supabase.from('work_orders').select('id,wo_no,qty_plan,status,created_at,items(sku,name)').order('created_at',{ascending:false}).limit(50)
  if(error) throw error
  return data || []
}

export default function WorkOrders(){
  const [sku,setSku]=React.useState('')
  const [qty,setQty]=React.useState<number>(100)
  const [due,setDue]=React.useState('')
  const [msg,setMsg]=React.useState('')
  const { data: list, refetch } = useQuery({queryKey:['work_orders'], queryFn:fetchWorkOrders})

  const createWO = async () => {
    setMsg('指示書発行中…')
    const { data:item, error:itemErr } = await supabase.from('items').select('id,name,sku').eq('sku',sku).maybeSingle()
    if(itemErr || !item){ setMsg('品目が見つかりません'); return }
    const { data:wo, error } = await supabase.from('work_orders').insert({
      product_id:item.id, qty_plan:qty, due_date:due||null, status:'RELEASED'
    }).select().single()
    if(error){ setMsg('エラー: '+error.message); return }
    // 単純に1工程ステップ追加
    await supabase.from('work_order_steps').insert({
      wo_id: wo.id, process_code:'PROC1', seq:1, planned_qty:qty
    })

    // PDF
    const pdf = new jsPDF()
    pdf.setFontSize(14)
    pdf.text('製造指示書', 14, 16)
    pdf.setFontSize(11)
    pdf.text(`指示No: ${wo.wo_no}`, 14, 24)
    pdf.text(`SKU: ${item.sku}`, 14, 32)
    pdf.text(`製品名: ${item.name}`, 14, 40)
    pdf.text(`数量: ${qty}`, 14, 48)
    if(due) pdf.text(`納期: ${due}`, 14, 56)
    pdf.text('実績記入欄: ___________________________', 14, 72)
    pdf.save(`WO_${wo.wo_no || item.sku}.pdf`)

    setMsg('指示書を発行しました')
    refetch()
  }

  const allocate = async () => {
    setMsg('自動引当中…')
    const { data:item } = await supabase.from('items').select('id').eq('sku',sku).maybeSingle()
    if(!item){ setMsg('品目が見つかりません'); return }
    const r = await fetch(`${FUNCTIONS_BASE}/allocate`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ product_id:item.id, qty_plan:qty }) })
    const j = await r.json()
    if(!j.ok){ setMsg('引当失敗: '+(j.message||j.error)); return }
    setMsg(`引当提案: ${j.reservations?.length||0}件 （不足: ${Object.values(j.perItemSummary||{}).reduce((acc:any,cur:any)=>acc+Number((cur as any).shortage||0),0)}）`)
  }

  return (
    <div className='card'>
      <h2>指示書発行</h2>
      <div className='grid grid-3'>
        <div><label>製品SKU</label><input className='input' value={sku} onChange={e=>setSku(e.target.value)} /></div>
        <div><label>数量</label><input className='input' type='number' value={qty} onChange={e=>setQty(parseFloat(e.target.value)||0)} /></div>
        <div><label>納期</label><input className='input' type='date' value={due} onChange={e=>setDue(e.target.value)} /></div>
      </div>
      <div style={{marginTop:12,display:'flex',gap:8}}>
        <button className='btn' onClick={allocate}>自動引当（試算）</button>
        <button className='btn' onClick={createWO}>発行 + PDF</button>
      </div>
      <p>{msg}</p>

      <h3>最近の指示書</h3>
      <table>
        <thead>
          <tr><th>No</th><th>SKU</th><th>品名</th><th>数量</th><th>状態</th></tr>
        </thead>
        <tbody>
          {(list||[]).map((w:any)=>(
            <tr key={w.id}>
              <td>{w.wo_no}</td>
              <td>{w.items?.sku}</td>
              <td>{w.items?.name}</td>
              <td>{w.qty_plan}</td>
              <td>{w.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
