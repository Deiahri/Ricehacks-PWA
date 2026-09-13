/** What a player just said, floating over their head on the map. */
export default function ChatBubble({ text }: { text: string }) {
  return (
    <div className="anim-pop-in flex flex-col items-center" style={{ pointerEvents: 'none', marginBottom: 2 }}>
      <div
        className="font-game font-black text-[11px] leading-snug px-2.5 py-1.5 rounded-2xl text-center"
        style={{
          background: '#ffffff',
          border: '2.5px solid #c8d0e0',
          color: '#1a2b4a',
          maxWidth: 150,
          wordBreak: 'break-word',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        }}
      >
        {text}
      </div>
      {/* Tail: a border-coloured triangle with a white one just above it. */}
      <div style={{ position: 'relative', width: 14, height: 7, marginTop: -1 }}>
        <div style={{ position: 'absolute', inset: 0, background: '#c8d0e0', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}/>
        <div style={{ position: 'absolute', left: 3, right: 3, top: 0, height: 4, background: '#ffffff', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}/>
      </div>
    </div>
  )
}
