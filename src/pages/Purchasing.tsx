
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { FUNCTIONS_BASE } from '../config'

async function fetchPO(){
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('id,po_no,order_date,status,suppliers(code,name)')
    .order('order_date',{ascending:false})
    .limit(50)
  if(error) throw error
  return data || []
}

export default function Purchasing(){
  const { data:list, refetch } = useQuery({queryKey:['po'], queryFn:fetchPO})
  const [supCode,setSupCode]=React.useState('')
  const [supName,setSupName]=React.useState('')
  const [sku,setSku]=React.useState('')
  const [qty,setQty]=React.useState<number>(0)
  const [price,setPrice]=React.useState<number>(0)
  const [msg,setMsg]=React.useState('')
  const [from,setFrom]=React.useState('2025-01-01')
  const [to,setTo]=React.useState('2025-12-31')

  const createPO = async () => {
    setMsg('発注書作成中…')
    let supplierId = null as any
    if(supCode){
      const { data:s } = await supabase.from('suppliers').select('id').eq('code',supCode).maybeSingle()
      if(s) supplierId = s.id
      else{
        const { data:newSup, error } = await supabase.from('suppliers').insert({code:supCode,name:supName||supCode}).select().single()
        if(error){ setMsg('仕入先登録エラー: '+error.message); return }
        supplierId = newSup.id
      }
    }
    const { data:item } = await supabase.from('items').select('id').eq('sku',sku).maybeSingle()
    if(!item){ setMsg('品目が見つかりません'); return }
    const { data:po, error } = await supabase.from('purchase_orders').insert({
      supplier_id:supplierId, status:'ORDERED'
    }).select().single()
    if(error){ setMsg('発注エラー: '+error.message); return }
    await supabase.from('purchase_order_lines').insert({
      po_id:po.id, item_id:item.id, qty, price
    })
    setMsg('発注書を作成しました')
    refetch()
  }

  const downloadCsv = async () => {
    const res = await fetch(`${FUNCTIONS_BASE}/export-yayoi?type=po&from=${from}&to=${to}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `po-${from}-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='card'>
      <h2>発注管理</h2>
      <div className='grid grid-3'>
        <div><label>仕入先コード</label><input className='input' value={supCode} onChange={e=>setSupCode(e.target.value)} /></div>
        <div><label>仕入先名</label><input className='input' value={supName} onChange={e=>setSupName(e.target.value)} /></div>
        <div><label>SKU</label><input className='input' value={sku} onChange={e=>setSku(e.target.value)} /></div>
      </div>
      <div className='grid grid-3' style={{marginTop:12}}>
        <div><label>数量</label><input className='input' type='number' value={qty} onChange={e=>setQty(parseFloat(e.target.value)||0)} /></div>
        <div><label>単価</label><input className='input' type='number' value={price} onChange={e=>setPrice(parseFloat(e.target.value)||0)} /></div>
      </div>
      <div style={{marginTop:12}}>
        <button className='btn' onClick={createPO}>発注書作成</button>
      </div>
      <p>{msg}</p>

      <h3>発注書一覧</h3>
      <table>
        <thead><tr><th>No</th><th>日付</th><th>仕入先</th><th>状態</th></tr></thead>
        <tbody>
          {(list||[]).map((p:any)=>(
            <tr key={p.id}>
              <td>{p.po_no}</td>
              <td>{p.order_date}</td>
              <td>{p.suppliers?.code} {p.suppliers?.name}</td>
              <td>{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>弥生販売用CSV（仮）出力</h3>
      <div className='grid grid-3'>
        <div><label>期間From</label><input className='input' type='date' value={from} onChange={e=>setFrom(e.target.value)} /></div>
        <div><label>期間To</label><input className='input' type='date' value={to} onChange={e=>setTo(e.target.value)} /></div>
      </div>
      <button className='btn' style={{marginTop:8}} onClick={downloadCsv}>CSVダウンロード</button>
    </div>
  )
}
