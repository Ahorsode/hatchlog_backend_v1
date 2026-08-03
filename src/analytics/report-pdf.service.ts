import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

type ComprehensiveReport = {
  startDate: string;
  endDate: string;
  kpis: {
    totalRevenue: number;
    totalExpense: number;
    netIncome: number;
    totalFeedConsumed: number;
    totalEggsCollected: number;
    totalMortality: number;
    mortalityRate: number;
    averageFcr: number;
  };
  financials: Array<{
    transactionDate: string;
    type: string;
    category: string;
    paymentMethod: string;
    paymentStatus: string;
    referenceNum: string | null;
    amount: number;
  }>;
  batches: Array<{
    batchName: string;
    status: string;
    initialCount: number;
    currentCount: number;
    mortalityCount: number;
    feedConsumed: number;
  }>;
};

@Injectable()
export class ReportPdfService {
  async buildComprehensivePdf(
    report: ComprehensiveReport,
    startDateStr: string,
    endDateStr: string,
  ): Promise<Buffer> {
    const startFormatted = new Date(startDateStr).toLocaleDateString();
    const endFormatted = new Date(endDateStr).toLocaleDateString();

    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });

    doc
      .fillColor('#1e293b')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('POULTRY MANAGEMENT SYSTEM', 40, 40);
    doc
      .font('Helvetica')
      .fillColor('#64748b')
      .fontSize(12)
      .text('Comprehensive Performance & GAAP Ledger Report', 40, 65);
    doc.moveTo(40, 85).lineTo(550, 85).strokeColor('#e2e8f0').stroke();

    doc.fillColor('#0f172a').fontSize(10);
    doc.text(`Report Period: ${startFormatted} to ${endFormatted}`, 40, 100);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 40, 115);
    doc.text('Report generated for your active farm', 40, 130);

    doc.rect(40, 155, 515, 80).fill('#f8fafc');
    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .fontSize(11)
      .text('KEY PERFORMANCE INDICATORS (KPIs)', 50, 165);

    const col1 = 50;
    const col2 = 220;
    const col3 = 390;

    doc.fontSize(9).fillColor('#475569');
    doc.font('Helvetica-Bold').text('Financials', col1, 185);
    doc
      .font('Helvetica')
      .text(
        `Total Revenue: GH₵ ${report.kpis.totalRevenue.toFixed(2)}`,
        col1,
        198,
      );
    doc.text(
      `Total Expense: GH₵ ${report.kpis.totalExpense.toFixed(2)}`,
      col1,
      210,
    );
    doc.fillColor(report.kpis.netIncome >= 0 ? '#16a34a' : '#dc2626');
    doc
      .font('Helvetica-Bold')
      .text(`Net Income: GH₵ ${report.kpis.netIncome.toFixed(2)}`, col1, 222);

    doc
      .font('Helvetica-Bold')
      .fillColor('#475569')
      .text('Production Metrics', col2, 185);
    doc
      .font('Helvetica')
      .text(
        `Eggs Collected: ${report.kpis.totalEggsCollected.toLocaleString()} pcs`,
        col2,
        198,
      );
    doc.text(
      `Feed Consumed: ${report.kpis.totalFeedConsumed.toLocaleString()} kg`,
      col2,
      210,
    );
    doc.text(`Average FCR: ${report.kpis.averageFcr.toFixed(2)}`, col2, 222);

    doc.font('Helvetica-Bold').text('Livestock Health', col3, 185);
    doc
      .font('Helvetica')
      .text(`Total Mortality: ${report.kpis.totalMortality} birds`, col3, 198);
    doc.text(
      `Mortality Rate: ${report.kpis.mortalityRate.toFixed(2)}%`,
      col3,
      210,
    );

    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .fontSize(11)
      .text('FINANCIAL LEDGER STATEMENTS', 40, 255);
    doc.moveTo(40, 270).lineTo(550, 270).strokeColor('#cbd5e1').stroke();

    const ftTop = 275;
    doc.font('Helvetica').fillColor('#475569').fontSize(8);
    doc.text('Date', 40, ftTop);
    doc.text('Type', 100, ftTop);
    doc.text('Category', 160, ftTop);
    doc.text('Method', 280, ftTop);
    doc.text('Status', 350, ftTop);
    doc.text('Reference', 410, ftTop);
    doc.text('Amount', 490, ftTop, { width: 60, align: 'right' });
    doc
      .moveTo(40, ftTop + 12)
      .lineTo(550, ftTop + 12)
      .strokeColor('#e2e8f0')
      .stroke();

    let y = ftTop + 18;
    for (const t of report.financials.slice(0, 15)) {
      if (y > 750) {
        doc.addPage();
        y = 40;
        doc.font('Helvetica').fillColor('#475569').fontSize(8);
        doc.text('Date', 40, y);
        doc.text('Type', 100, y);
        doc.text('Category', 160, y);
        doc.text('Method', 280, y);
        doc.text('Status', 350, y);
        doc.text('Reference', 410, y);
        doc.text('Amount', 490, y, { width: 60, align: 'right' });
        doc
          .moveTo(40, y + 12)
          .lineTo(550, y + 12)
          .strokeColor('#e2e8f0')
          .stroke();
        y += 18;
      }

      doc.font('Helvetica').fillColor('#0f172a').fontSize(8);
      doc.text(new Date(t.transactionDate).toLocaleDateString(), 40, y);

      doc.fillColor(t.type === 'REVENUE' ? '#16a34a' : '#dc2626');
      doc.text(t.type, 100, y);

      doc.fillColor('#0f172a');
      doc.text(t.category.substring(0, 20), 160, y);
      doc.text(t.paymentMethod, 280, y);

      const statusColor =
        t.paymentStatus === 'PAID'
          ? '#16a34a'
          : t.paymentStatus === 'UNPAID'
            ? '#dc2626'
            : '#d97706';
      doc.fillColor(statusColor);
      doc.text(t.paymentStatus, 350, y);

      doc.fillColor('#475569');
      doc.text((t.referenceNum || 'N/A').substring(0, 15), 410, y);

      doc.fillColor('#0f172a');
      doc.text(`GH₵ ${t.amount.toFixed(2)}`, 490, y, {
        width: 60,
        align: 'right',
      });

      y += 15;
    }

    if (y > 550) {
      doc.addPage();
      y = 40;
    } else {
      y += 20;
    }

    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .fontSize(11)
      .text('FLOCK PRODUCTION PERFORMANCE', 40, y);
    doc
      .moveTo(40, y + 15)
      .lineTo(550, y + 15)
      .strokeColor('#cbd5e1')
      .stroke();

    y += 20;
    doc.font('Helvetica').fillColor('#475569').fontSize(8);
    doc.text('Flock Name', 40, y);
    doc.text('Status', 160, y);
    doc.text('Initial Count', 240, y, { width: 60, align: 'right' });
    doc.text('Current Count', 320, y, { width: 60, align: 'right' });
    doc.text('Mortality', 400, y, { width: 60, align: 'right' });
    doc.text('Feed Consumed', 470, y, { width: 80, align: 'right' });
    doc
      .moveTo(40, y + 12)
      .lineTo(550, y + 12)
      .strokeColor('#e2e8f0')
      .stroke();

    y += 18;
    for (const b of report.batches) {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }

      doc.font('Helvetica').fillColor('#0f172a').fontSize(8);
      doc.text(b.batchName, 40, y);

      doc.fillColor(b.status === 'active' ? '#16a34a' : '#64748b');
      doc.text(b.status.toUpperCase(), 160, y);

      doc.fillColor('#0f172a');
      doc.text(b.initialCount.toLocaleString(), 240, y, {
        width: 60,
        align: 'right',
      });
      doc.text(b.currentCount.toLocaleString(), 320, y, {
        width: 60,
        align: 'right',
      });

      doc.fillColor(b.mortalityCount > 0 ? '#dc2626' : '#0f172a');
      doc.text(b.mortalityCount.toString(), 400, y, {
        width: 60,
        align: 'right',
      });

      doc.fillColor('#0f172a');
      doc.text(`${b.feedConsumed.toLocaleString()} kg`, 470, y, {
        width: 80,
        align: 'right',
      });

      y += 15;
    }

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.font('Helvetica').fillColor('#94a3b8').fontSize(7);
      doc.text(`HatchLog Report | Page ${i + 1} of ${range.count}`, 40, 800, {
        align: 'center',
        width: 515,
      });
    }

    doc.end();

    return new Promise<Buffer>((resolve, reject) => {
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err: unknown) =>
        reject(err instanceof Error ? err : new Error(String(err))),
      );
    });
  }
}
