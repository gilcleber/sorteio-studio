import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FileText } from 'lucide-react';

export default function RelatorioPanel({ participantes, eventoAtivoId, tituloEvento, dataSorteio, premio }) {

    const gerarPDF = () => {
        if (!participantes || participantes.length === 0) {
            alert("Não há participantes para gerar relatório.");
            return;
        }

        // Criar instância jsPDF
        const doc = new jsPDF();
        
        // Configurações e Cabeçalho
        const title = tituloEvento || "Relatório de Sorteio";
        const date = dataSorteio ? new Date(dataSorteio).toLocaleDateString() : new Date().toLocaleDateString();
        
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Data do Relatório/Sorteio: ${date}`, 14, 30);
        if (premio) {
            doc.text(`Prêmio em Disputa: ${premio}`, 14, 36);
        }
        doc.text(`Total de Inscritos: ${participantes.length}`, 14, 42);

        // Prepara Tabela
        const tableColumn = ["#", "Nome do Participante", "Telefone", "Cidade", "Data de Inscrição"];
        const tableRows = [];

        participantes.forEach((p, index) => {
            let cidade = "Não informado";
            if (p.cidade) cidade = p.cidade;
            else if (p.endereco) {
                const parts = p.endereco.split(/[-–,]/);
                if (parts.length > 1) {
                    const lastPart = parts[parts.length - 1].trim();
                    if (lastPart.length < 30 && !lastPart.match(/\d/)) cidade = lastPart;
                }
            }

            const pData = [
                index + 1,
                p.nome || "-",
                p.telefone || "-",
                cidade,
                p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"
            ];
            tableRows.push(pData);
        });

        // Configura autoTable
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [79, 70, 229] } // color indigo-600
        });

        // Download file
        const filename = `relatorio-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${date.replace(/\//g, '-')}.pdf`;
        doc.save(filename);
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg mb-4 flex items-center justify-between">
            <div className="flex flex-col">
                <span className="text-white font-bold text-sm">Exportar Lista Oficial</span>
                <span className="text-gray-400 text-xs">Gere um documento PDF com os {participantes?.length || 0} inscritos.</span>
            </div>
            <button
                onClick={gerarPDF}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg transition-all text-xs"
            >
                <FileText className="w-4 h-4" /> GERAR RELATÓRIO PDF
            </button>
        </div>
    );
}
