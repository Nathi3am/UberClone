import React from 'react';

const GlobalModal = ({ open, title, message, onClose }) => {
  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:'min(720px,92%)',background:'#071018',color:'#fff',borderRadius:12,padding:22,boxShadow:'0 12px 40px rgba(0,0,0,0.6)'}}>
        <h3 style={{margin:0,fontSize:18,fontWeight:700}}>{title || 'Notice'}</h3>
        <div style={{marginTop:12,fontSize:15,lineHeight:1.4,color:'#dfeff0'}}>{message}</div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:18}}>
          <button onClick={onClose} style={{background:'#10b981',border:'none',color:'#06201a',padding:'10px 14px',borderRadius:8,fontWeight:700}}>OK</button>
        </div>
      </div>
    </div>
  );
}

export default GlobalModal;
