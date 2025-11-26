
import * as React from 'react'
import { supabase } from '../services/supabase'

export default function Results(){
  const [woNo,setWoNo] = React.useState('')
  const [wo,setWo] = React.useState<any>(null)
  const [step,setStep] = React.useState<any>(null)
  const [good,setGood] = React.useState<number>(0)
  const [scrap,setScrap] = React.useState<number>(0)
  const [msg,setMsg] = React.useState('')

  const loadWo = async () => {
    setMsg('指示検索中…')
    const { data, error } = await supabase.from('work_orders').select('id,wo_no,qty_plan,status').eq('wo_no',woNo).maybeSingle()
    if(error || !data){ setMsg('指示が見つかりません'); setWo(null); return }
    const { data:steps } = await supabase.from('work_order_steps').select('id,process_code,planned_qty').eq('wo_id',data.id).limit(1)
    setWo(data)
    setStep(steps && steps[0])
    setMsg('指示を読み込みました')
  }

  const saveResult = async () => {
    if(!wo || !step){ setMsg('指示が未選択です'); return }
    setMsg('実績登録中…')
    const { error } = await supabase.from('production_results').insert({
      step_id: step.id,
      good_qty: good,
      scrap_qty: scrap
    })
    if(error){ setMsg('エラー: '+error.message); return }

    // 引当→在庫確定（簡易版）
    const { data:resv } = await supabase.from('reservations').select('*').eq('source_type','work_order').eq('source_id',wo.id)
    if(resv && resv.length){
      for(const r of resv){
        if(r.shortage) continue
        await supabase.from('inventory_txns').insert({
          item_id: r.item_id,
          lot_id: r.lot_id,
          qty: -Number(r.qty_reserved),
          txn_type: 'ISSUE',
          ref_type: 'WO',
          ref_no: wo.wo_no,
          reason: 'WO result'
        })
        // lot 在庫も減算
        if(r.lot_id){
          await supabase.rpc('noop') // ダミー: 本来は在庫更新用の関数を作るのがベスト
        }
      }
      await supabase.from('reservations').delete().eq('source_type','work_order').eq('source_id',wo.id)
    }
    setMsg('実績を登録しました')
  }

  return (
    <div className='card'>
      <h2>実績登録</h2>
      <div className='grid grid-3'>
        <div>
          <label>指示No</label>
          <input className='input' value={woNo} onChange={e=>setWoNo(e.target.value)} />
          <button className='btn' style={{marginTop:8}} onClick={loadWo}>読込</button>
        </div>
        <div>
          {wo && <>
            <p>計画数量: {wo.qty_plan}</p>
            <p>状態: {wo.status}</p>
          </>}
        </div>
        <div>
          {step && <>
            <p>工程: {step.process_code}</p>
            <p>計画: {step.planned_qty}</p>
          </>}
        </div>
      </div>
      <div className='grid grid-3' style={{marginTop:16}}>
        <div><label>良品数量</label><input className='input' type='number' value={good} onChange={e=>setGood(parseFloat(e.target.value)||0)} /></div>
        <div><label>不良数量</label><input className='input' type='number' value={scrap} onChange={e=>setScrap(parseFloat(e.target.value)||0)} /></div>
      </div>
      <div style={{marginTop:12}}>
        <button className='btn' onClick={saveResult}>実績登録</button>
      </div>
      <p>{msg}</p>
    </div>
  )
}
