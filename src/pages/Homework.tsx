
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import jsPDF from 'jspdf'

async function fetchOrders(){
  const { data, error } = await supabase
    .from('homework_orders')
    .select('id,ho_no,qty_plan,status,issued_at,homeworkers(code,name),homework_tasks(code,process_name)')
    .order('issued_at',{ascending:false})
    .limit(50)
  if(error) throw error
  return data || []
}

export default function Homework(){
  const { data:list, refetch } = useQuery({queryKey:['homework_orders'], queryFn:fetchOrders})
  const [workerCode,setWorkerCode]=React.useState('')
  const [workerName,setWorkerName]=React.useState('')
  const [taskCode,setTaskCode]=React.useState('')
  const [taskName,setTaskName]=React.useState('')
  const [unitPrice,setUnitPrice]=React.useState<number>(0)
  const [qty,setQty]=React.useState<number>(50)
  const [msg,setMsg]=React.useState('')

  const addMaster = async () => {
    if(workerCode){
      await supabase.from('homeworkers').upsert({code:workerCode,name:workerName||workerCode},{onConflict:'code'})
    }
    if(taskCode){
      await supabase.from('homework_tasks').upsert({code:taskCode,process_name:taskName||taskCode,unit_price:unitPrice},{onConflict:'code'})
    }
    setMsg('内職マスタを登録しました')
  }

  const issue = async () => {
    setMsg('内職指示を発行中…')
    const { data:hw } = await supabase.from('homeworkers').select('id,code,name').eq('code',workerCode).maybeSingle()
    const { data:task } = await supabase.from('homework_tasks').select('id,code,process_name,unit_price').eq('code',taskCode).maybeSingle()
    if(!hw || !task){ setMsg('内職者 or 作業マスタが見つかりません'); return }
    const { data:order, error } = await supabase.from('homework_orders').insert({
      homeworker_id:hw.id, task_id:task.id, qty_plan:qty, status:'ISSUED'
    }).select().single()
    if(error){ setMsg('エラー: '+error.message); return }

    const pdf = new jsPDF()
    pdf.setFontSize(14)
    pdf.text('内職指示書', 14, 16)
    pdf.setFontSize(11)
    pdf.text(`指示No: ${order.ho_no}`, 14, 24)
    pdf.text(`内職者: ${hw.code} ${hw.name}`, 14, 32)
    pdf.text(`作業: ${task.code} / ${task.process_name}`, 14, 40)
    pdf.text(`数量: ${qty}`, 14, 48)
    pdf.text(`単価: ${task.unit_price}`, 14, 56)
    pdf.text('受領サイン: ______________________', 14, 72)
    pdf.save(`HO_${order.ho_no}.pdf`)

    setMsg('内職指示書を発行しました')
    refetch()
  }

  const [resultQty,setResultQty]=React.useState<number>(0)
  const [selectedOrderId,setSelectedOrderId]=React.useState<string>('')

  const record = async () => {
    setMsg('実績登録中…')
    const orderId = selectedOrderId || (list && list[0]?.id)
    if(!orderId){ setMsg('対象指示がありません'); return }
    const { error } = await supabase.from('homework_results').insert({
      order_id:orderId, qty_done:resultQty
    })
    if(error){ setMsg('エラー: '+error.message); return }
    setMsg('内職実績を登録しました')
  }

  return (
    <div className='card'>
      <h2>内職管理</h2>
      <h3>マスタ登録</h3>
      <div className='grid grid-3'>
        <div><label>内職者コード</label><input className='input' value={workerCode} onChange={e=>setWorkerCode(e.target.value)} /></div>
        <div><label>内職者名</label><input className='input' value={workerName} onChange={e=>setWorkerName(e.target.value)} /></div>
        <div><label>作業コード</label><input className='input' value={taskCode} onChange={e=>setTaskCode(e.target.value)} /></div>
      </div>
      <div className='grid grid-3' style={{marginTop:8}}>
        <div><label>作業名</label><input className='input' value={taskName} onChange={e=>setTaskName(e.target.value)} /></div>
        <div><label>単価</label><input className='input' type='number' value={unitPrice} onChange={e=>setUnitPrice(parseFloat(e.target.value)||0)} /></div>
      </div>
      <button className='btn' style={{marginTop:8}} onClick={addMaster}>マスタ登録</button>

      <h3 style={{marginTop:16}}>指示書発行</h3>
      <div className='grid grid-3'>
        <div><label>内職者コード</label><input className='input' value={workerCode} onChange={e=>setWorkerCode(e.target.value)} /></div>
        <div><label>作業コード</label><input className='input' value={taskCode} onChange={e=>setTaskCode(e.target.value)} /></div>
        <div><label>数量</label><input className='input' type='number' value={qty} onChange={e=>setQty(parseFloat(e.target.value)||0)} /></div>
      </div>
      <button className='btn' style={{marginTop:8}} onClick={issue}>内職指示書 発行 + PDF</button>

      <h3 style={{marginTop:16}}>実績登録</h3>
      <div className='grid grid-3'>
        <div>
          <label>対象指示</label>
          <select className='input' value={selectedOrderId} onChange={e=>setSelectedOrderId(e.target.value)}>
            <option value="">最新の指示</option>
            {(list||[]).map((o:any)=>(
              <option key={o.id} value={o.id}>{o.ho_no} {o.homeworkers?.code}</option>
            ))}
          </select>
        </div>
        <div><label>良品数量</label><input className='input' type='number' value={resultQty} onChange={e=>setResultQty(parseFloat(e.target.value)||0)} /></div>
      </div>
      <button className='btn' style={{marginTop:8}} onClick={record}>内職実績 登録</button>

      <h3 style={{marginTop:16}}>内職指示一覧</h3>
      <table>
        <thead><tr><th>No</th><th>内職者</th><th>作業</th><th>数量</th><th>状態</th></tr></thead>
        <tbody>
          {(list||[]).map((o:any)=>(
            <tr key={o.id}>
              <td>{o.ho_no}</td>
              <td>{o.homeworkers?.code} {o.homeworkers?.name}</td>
              <td>{o.homework_tasks?.code} {o.homework_tasks?.process_name}</td>
              <td>{o.qty_plan}</td>
              <td>{o.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>{msg}</p>
    </div>
  )
}
