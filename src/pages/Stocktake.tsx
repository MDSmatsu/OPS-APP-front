
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { Html5QrcodeScanner } from 'html5-qrcode'

function useActiveStocktake() {
  return useQuery({
    queryKey:['stocktake-active'],
    queryFn: async ()=>{
      const { data, error } = await supabase.from('stocktakes').select('id,st_no,status').eq('status','COUNTING').limit(1)
      if(error) throw error
      return data && data[0] || null
    }
  })
}

export default function Stocktake(){
  const { data:active, refetch } = useActiveStocktake()
  const [locCode,setLocCode]=React.useState('')
  const [scanResult,setScanResult]=React.useState('')
  const [sku,setSku]=React.useState('')
  const [qty,setQty]=React.useState<number>(1)
  const [msg,setMsg]=React.useState('')

  const create = async () => {
    setMsg('棚卸開始…')
    let locationId = null as any
    if(locCode){
      const { data:loc } = await supabase.from('locations').select('id').eq('code',locCode).maybeSingle()
      if(loc) locationId = loc.id
    }
    const { error } = await supabase.from('stocktakes').insert({
      location_id:locationId, status:'COUNTING'
    })
    if(error){ setMsg('エラー: '+error.message); return }
    setMsg('棚卸を開始しました')
    refetch()
  }

  React.useEffect(()=>{
    const el = document.getElementById('reader')
    if(!el) return
    const scanner = new Html5QrcodeScanner('reader',{fps:10,qrbox:250},false)
    scanner.render((decodedText)=>{
      setScanResult(decodedText)
      setSku(decodedText)
    }, ()=>{})
    return ()=>{ try{scanner.clear()}catch(e){} }
  },[])

  const addLine = async () => {
    if(!active){ setMsg('棚卸が開始されていません'); return }
    const { data:item } = await supabase.from('items').select('id,sku').or(`sku.eq.${sku},barcode.eq.${sku}`).maybeSingle()
    if(!item){ setMsg('品目が見つかりません'); return }
    const { data:line } = await supabase.from('stocktake_lines').select('id,counted_qty').eq('st_id',active.id).eq('item_id',item.id).maybeSingle()
    if(line){
      await supabase.from('stocktake_lines').update({counted_qty:Number(line.counted_qty||0)+qty}).eq('id',line.id)
    }else{
      await supabase.from('stocktake_lines').insert({
        st_id:active.id, item_id:item.id, counted_qty:qty
      })
    }
    setMsg('カウントを登録しました')
  }

  const apply = async () => {
    if(!active){ setMsg('棚卸が開始されていません'); return }
    setMsg('差分計算中…')
    const { data:lines } = await supabase.from('stocktake_lines').select('id,item_id,counted_qty').eq('st_id',active.id)
    const { data:bal } = await supabase.from('v_item_balance').select('item_id,on_hand')
    const balMap: Record<string,number> = {}
    ;(bal||[]).forEach((b:any)=>{balMap[b.item_id]=Number(b.on_hand||0)})
    for(const l of (lines||[])){
      const counted = Number(l.counted_qty||0)
      const onhand = balMap[l.item_id] ?? 0
      const diff = counted - onhand
      if(diff !== 0){
        await supabase.from('inventory_txns').insert({
          item_id:l.item_id,
          lot_id:null,
          qty:diff,
          txn_type:'ADJUST',
          ref_type:'ST',
          ref_no:active.st_no,
          reason:'stocktake adjust'
        })
      }
    }
    await supabase.from('stocktakes').update({status:'APPLIED'}).eq('id',active.id)
    setMsg('棚卸差分を適用しました')
    refetch()
  }

  return (
    <div className='card'>
      <h2>棚卸</h2>
      <div className='grid grid-3'>
        <div>
          <label>ロケーションコード</label>
          <input className='input' value={locCode} onChange={e=>setLocCode(e.target.value)} />
          <button className='btn' style={{marginTop:8}} onClick={create}>棚卸開始</button>
        </div>
        <div>
          {active && <>
            <p>進行中棚卸: {active.st_no}</p>
          </>}
        </div>
      </div>
      <div style={{marginTop:16}}>
        <div id="reader" style={{width:280}}></div>
        <p>スキャン結果: {scanResult}</p>
      </div>
      <div className='grid grid-3' style={{marginTop:12}}>
        <div><label>SKU/バーコード</label><input className='input' value={sku} onChange={e=>setSku(e.target.value)} /></div>
        <div><label>数量</label><input className='input' type='number' value={qty} onChange={e=>setQty(parseFloat(e.target.value)||0)} /></div>
      </div>
      <button className='btn' style={{marginTop:8}} onClick={addLine}>棚卸数量追加</button>
      <button className='btn' style={{marginTop:8,marginLeft:8}} onClick={apply}>差分適用</button>
      <p>{msg}</p>
    </div>
  )
}
