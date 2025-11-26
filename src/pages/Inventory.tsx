
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'

async function fetchLots(){
  const { data, error } = await supabase
    .from('inventory_lots')
    .select('id,lot_no,qty_on_hand,expiry_at,items(sku,name),locations(code)')
    .order('created_at',{ascending:false})
    .limit(100)
  if(error) throw error
  return data || []
}

export default function Inventory(){
  const { data:lots, refetch } = useQuery({queryKey:['lots'], queryFn:fetchLots})
  const [sku,setSku]=React.useState('')
  const [lotNo,setLotNo]=React.useState('')
  const [qty,setQty]=React.useState<number>(0)
  const [locCode,setLocCode]=React.useState('')
  const [type,setType]=React.useState<'RECEIPT'|'ISSUE'>('RECEIPT')
  const [msg,setMsg]=React.useState('')

  const submit = async () => {
    setMsg('在庫処理中…')
    const { data:item } = await supabase.from('items').select('id').eq('sku',sku).maybeSingle()
    if(!item){ setMsg('品目が見つかりません'); return }
    let locationId = null as any
    if(locCode){
      const { data:loc } = await supabase.from('locations').select('id').eq('code',locCode).maybeSingle()
      if(loc) locationId = loc.id
    }
    const { data:lot } = await supabase.from('inventory_lots')
      .select('id,qty_on_hand')
      .eq('item_id',item.id)
      .eq('lot_no',lotNo || null)
      .maybeSingle()

    if(type === 'RECEIPT'){
      let lotId = lot?.id
      if(!lotId){
        const { data:newLot, error } = await supabase.from('inventory_lots').insert({
          item_id:item.id,
          location_id:locationId,
          lot_no: lotNo || null,
          qty_on_hand: qty
        }).select().single()
        if(error){ setMsg('エラー: '+error.message); return }
        lotId = newLot.id
      }else{
        await supabase.from('inventory_lots').update({ qty_on_hand: (Number(lot?.qty_on_hand||0)+qty) }).eq('id',lotId)
      }
      await supabase.from('inventory_txns').insert({
        item_id:item.id, lot_id:lotId, qty:qty, txn_type:'RECEIPT', ref_type:'MANUAL', reason:'manual receipt'
      })
    }else{
      if(!lot){ setMsg('ロット在庫がありません'); return }
      const newQty = Number(lot.qty_on_hand||0) - qty
      await supabase.from('inventory_lots').update({ qty_on_hand:newQty }).eq('id',lot.id)
      await supabase.from('inventory_txns').insert({
        item_id:item.id, lot_id:lot.id, qty:-qty, txn_type:'ISSUE', ref_type:'MANUAL', reason:'manual issue'
      })
    }
    setMsg('在庫処理を登録しました')
    refetch()
  }

  return (
    <div className='card'>
      <h2>在庫一覧・入出庫</h2>
      <div className='grid grid-3'>
        <div><label>SKU</label><input className='input' value={sku} onChange={e=>setSku(e.target.value)} /></div>
        <div><label>ロットNo</label><input className='input' value={lotNo} onChange={e=>setLotNo(e.target.value)} /></div>
        <div><label>ロケーション</label><input className='input' value={locCode} onChange={e=>setLocCode(e.target.value)} /></div>
      </div>
      <div className='grid grid-3' style={{marginTop:12}}>
        <div>
          <label>種別</label>
          <select className='input' value={type} onChange={e=>setType(e.target.value as any)}>
            <option value="RECEIPT">入庫</option>
            <option value="ISSUE">出庫</option>
          </select>
        </div>
        <div><label>数量</label><input className='input' type='number' value={qty} onChange={e=>setQty(parseFloat(e.target.value)||0)} /></div>
      </div>
      <div style={{marginTop:12}}>
        <button className='btn' onClick={submit}>在庫登録</button>
      </div>
      <p>{msg}</p>

      <h3>在庫ロット一覧</h3>
      <table>
        <thead>
          <tr><th>SKU</th><th>品名</th><th>ロット</th><th>ロケ</th><th>数量</th><th>期限</th></tr>
        </thead>
        <tbody>
          {(lots||[]).map((l:any)=>(
            <tr key={l.id}>
              <td>{l.items?.sku}</td>
              <td>{l.items?.name}</td>
              <td>{l.lot_no}</td>
              <td>{l.locations?.code}</td>
              <td>{l.qty_on_hand}</td>
              <td>{l.expiry_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
