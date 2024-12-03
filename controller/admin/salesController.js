const Order = require('../../models/user/userOrder');
const Excel = require('exceljs');
const PdfPrinter = require('pdfmake');



const loadSales = async (req, res) => {
    try {
        let { reportType, startDate, endDate } = req.query;
        let query = {};
        
        if (Array.isArray(startDate)) {
            startDate = startDate[0];
        }
        if (Array.isArray(endDate)) {
            endDate = endDate[0];
        }
       
        if (reportType === 'custom' && startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);  

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error('Invalid date format');
            }

            query.createdAt = { $gte: start, $lte: end };
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
 
            switch (reportType) {
                case 'daily':
                    query.createdAt = { $gte: today };
                    break;
                case 'weekly':
                    const oneWeekAgo = new Date(today);
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    query.createdAt = { $gte: oneWeekAgo };
                    break;
                case 'monthly':
                    const oneMonthAgo = new Date(today);
                    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                    query.createdAt = { $gte: oneMonthAgo };
                    break;
                case 'yearly':
                    const oneYearAgo = new Date(today);
                    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                    query.createdAt = { $gte: oneYearAgo };
                    break;
                default:
                   
                    break;
            }
        }

        const orders = await Order.find(query);
        res.render('salesreport', { orders });
    } catch (error) {
        console.error('Error in loadSales:', error.message);
        res.status(500).send('An error occurred while loading sales data');
    }
};
const downloadPDF = async (req, res) => {
    try {
        let { reportType, startDate, endDate } = req.query;
        let query = {};
        
        if (Array.isArray(startDate)) {
            startDate = startDate[0];
        }
        if (Array.isArray(endDate)) {
            endDate = endDate[0];
        }
       
        if (reportType === 'custom' && startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);  

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error('Invalid date format');
            }

            query.createdAt = { $gte: start, $lte: end };
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            switch (reportType) {
                case 'daily':
                    query.createdAt = { $gte: today };
                    break;
                case 'weekly':
                    const oneWeekAgo = new Date(today);
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    query.createdAt = { $gte: oneWeekAgo };
                    break;
                case 'monthly':
                    const oneMonthAgo = new Date(today);
                    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                    query.createdAt = { $gte: oneMonthAgo };
                    break;
                case 'yearly':
                    const oneYearAgo = new Date(today);
                    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                    query.createdAt = { $gte: oneYearAgo };
                    break;
                default:
                    break;
            }
        }

        const orders = await Order.find(query);

        let grandTotal = 0;
        let grandDiscount = 0;

        const orderRows = orders.map(order => {
            grandTotal += order.total_amount;
            grandDiscount += order.discount;
            return [
                order.orderId,
                new Date(order.createdAt).toLocaleDateString(),
                order.items.map(item => item.quantity).join(', '),
                order.items.map(item => item.price).join(', '),
                order.total_amount.toFixed(2),
                order.discount > 0 ? 'Applied' : 'Not Applied',
                order.discount > 0 ? order.discount.toFixed(2) : '0.00'
            ];
        });

        const grandTotalRow = [
            { text: 'Grand Total', colSpan: 4, alignment: 'right', bold: true },
            {}, {}, {},
            { text: grandTotal.toFixed(2), bold: true },
            { text: 'Total Discount', bold: true },
            { text: grandDiscount.toFixed(2), bold: true }
        ];

        const fonts = {
            Helvetica: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };

        const printer = new PdfPrinter(fonts);

        const docDefinition = {
            content: [
                { text: 'Sales Report', style: 'header' },
                { text: `Report Type: ${reportType}`, style: 'subheader' },
                reportType === 'custom' ? { text: `Date Range: ${startDate} to ${endDate}`, style: 'subheader' } : {},
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
                        body: [
                            ['Order ID', 'Date', 'Items', 'Price', 'Total Amount', 'Coupon Deduction', 'Discount'],
                            ...orderRows,
                            grandTotalRow
                        ]
                    }
                }
            ],
            defaultStyle: {
                font: 'Helvetica'
            },
            styles: {
                header: {
                    fontSize: 18,
                    bold: true,
                    margin: [0, 0, 0, 10]
                },
                subheader: {
                    fontSize: 14,
                    bold: true,
                    margin: [0, 0, 0, 5]
                }
            }
        };

        const pdfDoc = printer.createPdfKitDocument(docDefinition);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

        pdfDoc.pipe(res);
        pdfDoc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('An error occurred while generating the PDF');
    }
};





const downloadExcel = async (req, res) => {
    try {
        let { reportType, startDate, endDate } = req.query;
        let query = {};
        
        if (Array.isArray(startDate)) {
            startDate = startDate[0];
        }
        if (Array.isArray(endDate)) {
            endDate = endDate[0];
        }
       
        if (reportType === 'custom' && startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);  

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error('Invalid date format');
            }

            query.createdAt = { $gte: start, $lte: end };
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            switch (reportType) {
                case 'daily':
                    query.createdAt = { $gte: today };
                    break;
                case 'weekly':
                    const oneWeekAgo = new Date(today);
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    query.createdAt= { $gte: oneWeekAgo };
                    break;
                case 'monthly':
                    const oneMonthAgo = new Date(today);
                    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                    query.createdAt = { $gte: oneMonthAgo };
                    break;
                case 'yearly':
                    const oneYearAgo = new Date(today);
                    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                    query.createdAt = { $gte: oneYearAgo };
                    break;
                default:
                    break;
            }
        }

        const orders = await Order.find(query);

        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.addRow(['Sales Report']);
        worksheet.addRow(['Report Type:', reportType]);
        if (reportType === 'custom') {
            worksheet.addRow(['Date Range:', `${startDate} to ${endDate}`]);
        }
        worksheet.addRow([]);  

        worksheet.addRow(['Order ID', 'Date', 'Items', 'Price', 'Total Amount', 'Coupon Deduction', 'Discount']);

        let grandTotal = 0;
        let grandDiscount = 0;

        orders.forEach(order => {
            worksheet.addRow([
                order.orderId,
                new Date(order.createdAt).toLocaleDateString(),
                order.items.map(item => item.quantity).join(', '),
                order.items.map(item => item.price).join(', '),
                order.total_amount,
                order.discount > 0 ? 'Applied' : 'Not Applied',
                order.discount > 0 ? order.discount : '0.00'
            ]);
            grandTotal += order.total_amount;
            grandDiscount += order.discount;
        });

       
        worksheet.addRow([
            'Grand Total', '', '', '', 
            grandTotal.toFixed(2), 'Total Discount', grandDiscount.toFixed(2)
        ]);

       
        worksheet.getRow(1).font = { bold: true, size: 16 };
        worksheet.getRow(5).font = { bold: true };
        worksheet.getRow(worksheet.rowCount).font = { bold: true };  
        worksheet.columns.forEach(column => {
            column.width = 15;
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).send('An error occurred while generating the Excel file');
    }
};


module.exports = {
    loadSales,
    downloadPDF,
    downloadExcel
};