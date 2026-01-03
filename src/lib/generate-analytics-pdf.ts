import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ExportOptions {
    filename?: string;
    title?: string;
    elementId?: string; // If provided, captures specific element. Else captures document.body (or valid analytics container)
}

export async function generateAnalyticsPDF({
    filename = 'analytics-report.pdf',
    title = 'Analytics Report',
    elementId,
}: ExportOptions) {
    try {
        const input = elementId ? document.getElementById(elementId) : document.body;

        if (!input) {
            console.error('Export target not found');
            return;
        }

        // Add a class to body/container to force specific "print" styles if needed
        input.classList.add('printing-mode');

        const canvas = await html2canvas(input, {
            scale: 2, // Retina resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#050505', // Match "Void" background
            ignoreElements: (element) => element.classList.contains('no-print'),
        });

        input.classList.remove('printing-mode');

        const imgData = canvas.toDataURL('image/png');

        // A4 dimensions in mm
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
        });

        const imgWidth = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Verify if height exceeds A4 (210mm), simplified for now (scale to fit or user specific page)
        // For tactical dashboards, usually landscape fit is desired.

        pdf.setFillColor(5, 5, 5); // Dark background
        pdf.rect(0, 0, 297, 210, 'F');

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        // Add Metadata Footer
        pdf.setTextColor(100);
        pdf.setFontSize(8);
        pdf.text(
            `Generated: ${new Date().toLocaleString()} | ${title}`,
            10,
            205
        );

        pdf.save(filename);
        return true;
    } catch (error) {
        console.error('PDF Generation failed', error);
        return false;
    }
}
