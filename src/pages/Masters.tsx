
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'

function useItems(){
  return useQuery({
    queryKey:['items'],
    queryFn: async ()=>{
      const { data, error } = await supabase.from('items').select('id,sku,name,type,unit,active').order('sku')
      if(error) throw error
      return data || []
    }
  })
}

function useLocations(){
  return useQuery({
    queryKey:['locations'],
    queryFn: async ()=>{
      const { data, error } = await supabase.from('locations').select('id,code,name').order('code')
      if(error) throw error
      return data || []
    }
  })
}

function useSuppliers(){
  return useQuery({
    queryKey:['suppliers'],
    queryFn: async ()=>{
      const { data, error } = await supabase.from('suppliers').select('id,code,name').order('code')
      if(error) throw error
      return data || []
    }
  })
}

export default function Masters(){
  const [tab,setTab] = React.useState<'items'|'locations'|'suppliers'>('items')
  const itemsQ = useItems()
  const locQ = useLocations()
  const supQ = useSuppliers()

  const [itemSku,setItemSku]=React.useState('')
  const [itemName,setItemName]=React.useState('')
  const [itemType,setItemType]=React.useState('product')

  const [locCode,setLocCode]=React.useState('')
  const [locName,setLocName]=React.useState('')

  const [supCode,setSupCode]=React.useState('')
  const [supName,setSupName]=React.useState('')

  const [msg,setMsg]=React.useState('')

  const addItem = async () => {
    const { error } = await supabase.from('items').insert({sku:itemSku,name:itemName,type:itemType,unit:'pcs'})
    if(error){ setMsg('品目登録エラー: '+error.message); return }
    setMsg('品目を登録しました')
    itemsQ.refetch()
  }

  const addLoc = async () => {
    const { error } = await supabase.from('locations').insert({code:locCode,name:locName})
    if(error){ setMsg('ロケーション登録エラー: '+error.message); return }
    setMsg('ロケーションを登録しました')
    locQ.refetch()
  }

  const addSup = async () => {
    const { error } = await supabase.from('suppliers').insert({code:supCode,name:supName})
    if(error){ setMsg('仕入先登録エラー: '+error.message); return }
    setMsg('仕入先を登録しました')
    supQ.refetch()
  }

  return (
    <div className='card'>
      <h2>マスタ管理</h2>
      <div style={{marginBottom:12}}>
        <button className='btn' onClick={()=>setTab('items')}>品目</button>
        <button className='btn' onClick={()=>setTab('locations')} style={{marginLeft:8}}>ロケーション</button>
        <button className='btn' onClick={()=>setTab('suppliers')} style={{marginLeft:8}}>仕入先</button>
      </div>

      {tab==='items' && (
        <>
          <div className='grid grid-3'>
            <div><label>SKU</label><input className='input' value={itemSku} onChange={e=>setItemSku(e.target.value)} /></div>
            <div><label>品名</label><input className='input' value={itemName} onChange={e=>setItemName(e.target.value)} /></div>
            <div>
              <label>種別</label>
              <select className='input' value={itemType} onChange={e=>setItemType(e.target.value)}>
                <option value="product">製品</option>
                <option value="semi">仕掛り</option>
                <option value="material">部材</option>
              </select>
            </div>
          </div>
          <button className='btn' style={{marginTop:8}} onClick={addItem}>品目登録</button>
          <h3>品目一覧</h3>
          <table>
            <thead><tr><th>SKU</th><th>品名</th><th>種別</th><th>有効</th></tr></thead>
            <tbody>
              {(itemsQ.data||[]).map((i:any)=>(
                <tr key={i.id}><td>{i.sku}</td><td>{i.name}</td><td>{i.type}</td><td>{i.active?'○':'×'}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab==='locations' && (
        <>
          <div className='grid grid-2'>
            <div><label>コード</label><input className='input' value={locCode} onChange={e=>setLocCode(e.target.value)} /></div>
            <div><label>名称</label><input className='input' value={locName} onChange={e=>setLocName(e.target.value)} /></div>
          </div>
          <button className='btn' style={{marginTop:8}} onClick={addLoc}>ロケーション登録</button>
          <h3>ロケーション一覧</h3>
          <table>
            <thead><tr><th>コード</th><th>名称</th></tr></thead>
            <tbody>
              {(locQ.data||[]).map((l:any)=>(
                <tr key={l.id}><td>{l.code}</td><td>{l.name}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab==='suppliers' && (
        <>
          <div className='grid grid-2'>
            <div><label>コード</label><input className='input' value={supCode} onChange={e=>setSupCode(e.target.value)} /></div>
            <div><label>名称</label><input className='input' value={supName} onChange={e=>setSupName(e.target.value)} /></div>
          </div>
          <button className='btn' style={{marginTop:8}} onClick={addSup}>仕入先登録</button>
          <h3>仕入先一覧</h3>
          <table>
            <thead><tr><th>コード</th><th>名称</th></tr></thead>
            <tbody>
              {(supQ.data||[]).map((s:any)=>(
                <tr key={s.id}><td>{s.code}</td><td>{s.name}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p>{msg}</p>
    </div>
  )
}
