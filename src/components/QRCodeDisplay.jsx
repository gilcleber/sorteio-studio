import React from 'react'
import { Copy, Download } from 'lucide-react'

export default function QRCodeDisplay({ url }) {
  // Utilizamos a robusta API do QRServer para evitar sobrecarga de RAM do runtime compilador React
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(url)}`

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    alert("Link do Sorteio copiado com sucesso!")
  }

  const handleDownload = async () => {
    try {
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = "qrcode-sorteio.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch(e) {
        window.open(qrUrl, '_blank')
    }
  }

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-xl border border-gray-200">
      <img src={qrUrl} alt="QR Code Público" className="w-48 h-48 mb-4 border border-gray-100 rounded-lg p-2 bg-white" />
      <div className="flex gap-2 w-full">
        <button onClick={handleCopy} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center gap-2 py-2 rounded text-sm font-bold transition-all"><Copy className="w-4 h-4"/> Copiar Link</button>
        <button onClick={handleDownload} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2 py-2 rounded text-sm font-bold transition-all"><Download className="w-4 h-4"/> Imprimir/Baixar</button>
      </div>
      <p className="text-[10px] text-gray-400 mt-3 text-center">{url.replace("https://", "")}</p>
    </div>
  )
}
