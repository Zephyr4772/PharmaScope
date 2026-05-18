import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Field label mapping
const FIELD_LABELS = {
    salt_composition: 'Salt Composition',
    manufacturer: 'Manufacturer',
    price: 'Price',
    category: 'Category',
    description: 'Description',
    side_effects: 'Side Effects',
    drug_interactions: 'Drug Interactions',
    rating: 'Rating',
    total_reviews: 'Reviews',
};

// Helper to extract nested values
const getFieldValue = (drug, fieldKey) => {
    if (fieldKey === 'rating') {
        const rating = drug.layer1_reviews?.avg_rating || drug.rating;
        return rating ? `${parseFloat(rating).toFixed(1)} / 10` : 'N/A';
    }
    if (fieldKey === 'total_reviews') {
        const reviews = drug.layer1_reviews?.total_reviews;
        return reviews ? `${reviews} reviews` : 'N/A';
    }
    if (fieldKey === 'price') {
        const price = drug.price;
        if (!price) return 'N/A';
        const str = String(price);
        // Sanitize HTML entities
        if (str.includes('&')) {
            return 'Rs. ' + str.replace(/[^\d.]/g, '');
        }
        return str.startsWith('₹') ? str.replace('₹', 'Rs. ') : str;
    }
    return drug[fieldKey] || 'N/A';
};

/**
 * Generate a professionally formatted PDF for a list of drugs
 * @param {Array} drugs - List of drug objects
 * @param {string} title - Title of the report
 * @param {Array} selectedFields - Optional: fields to include (respects user selection)
 */
export const generateDrugPDF = (drugs, title = 'PharmaLens Drug Report', selectedFields = null) => {
    // Default fields if none specified
    const fields = selectedFields || ['manufacturer', 'price', 'category', 'rating', 'salt_composition'];

    // Portrait mode for cleaner reading
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    // --- Header ---
    const drawHeader = (isFirstPage = false) => {
        // Simple header bar
        doc.setFillColor(248, 250, 252); // Light gray bg
        doc.rect(0, 0, pageWidth, isFirstPage ? 45 : 25, 'F');

        // Brand name
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.setFontSize(isFirstPage ? 20 : 12);
        doc.setFont('helvetica', 'bold');
        doc.text('PharmaLens', margin, isFirstPage ? 18 : 16);

        // Report title
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.setFontSize(isFirstPage ? 12 : 10);
        doc.setFont('helvetica', 'normal');
        doc.text(title, pageWidth - margin, isFirstPage ? 18 : 16, { align: 'right' });

        if (isFirstPage) {
            // Subtitle with count
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`${drugs.length} products • Generated ${new Date().toLocaleDateString('en-GB')}`, margin, 28);

            // Divider line
            doc.setDrawColor(226, 232, 240); // Slate-200
            doc.setLineWidth(0.5);
            doc.line(margin, 40, pageWidth - margin, 40);
        }
    };

    drawHeader(true);
    let currentY = 50;

    // --- Drug Entries ---
    drugs.forEach((drug, index) => {
        // Calculate space needed (approx)
        const neededSpace = 60 + (fields.length * 8);

        // Page break check
        if (currentY + neededSpace > pageHeight - 20) {
            doc.addPage();
            drawHeader(false);
            currentY = 35;
        }

        // Drug number badge
        doc.setFillColor(99, 102, 241); // Indigo
        doc.roundedRect(margin, currentY, 8, 8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(String(index + 1), margin + 4, currentY + 5.5, { align: 'center' });

        // Product Name
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const productName = drug.product_name || 'Unknown Drug';
        const nameLines = doc.splitTextToSize(productName, pageWidth - margin - 35);
        doc.text(nameLines, margin + 12, currentY + 6);
        currentY += (nameLines.length * 5) + 8;

        // ID if available
        if (drug.id) {
            doc.setTextColor(148, 163, 184);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`ID: ${drug.id}`, margin + 12, currentY);
            currentY += 6;
        }

        // Fields table using autoTable
        const tableBody = fields.map(fieldKey => [
            FIELD_LABELS[fieldKey] || fieldKey,
            String(getFieldValue(drug, fieldKey))
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [], // No header row
            body: tableBody,
            margin: { left: margin + 12, right: margin },
            tableWidth: pageWidth - margin * 2 - 12,
            styles: {
                fontSize: 9,
                cellPadding: 3,
                textColor: [51, 65, 85], // Slate-700
                lineColor: [241, 245, 249], // Slate-100
                lineWidth: 0.1
            },
            columnStyles: {
                0: {
                    fontStyle: 'bold',
                    cellWidth: 40,
                    textColor: [100, 116, 139] // Slate-500
                },
                1: {
                    cellWidth: 'auto'
                }
            },
            theme: 'plain',
            didDrawPage: () => {
                // Handle page breaks within table
            }
        });

        currentY = doc.lastAutoTable.finalY + 12;

        // Separator line between entries
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(margin, currentY - 4, pageWidth - margin, currentY - 4);
    });

    // --- Footer with page numbers ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }

    // Save
    const filename = title.replace(/[^a-zA-Z0-9]/g, '_') + '_' + new Date().getTime() + '.pdf';
    doc.save(filename);
};
