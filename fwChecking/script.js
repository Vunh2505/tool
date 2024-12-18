let chartInstance = null; 
document.addEventListener("DOMContentLoaded", () => {
    const interestRatesInput = document.getElementById("interestRatesInput");
    const portfolioInput = document.getElementById("portfolioInput");
    const npvLadderInput = document.getElementById("npvLadderInput");
    const exchangeRatesInput = document.getElementById("exchangeRatesInput");
    const processDataButton = document.getElementById("processData");
    const tableContainer = document.getElementById("tableContainer");
    const npvChart = document.getElementById("npvChart");

    processDataButton.addEventListener("click", () => {
        try {
            const interestRates = JSON.parse(interestRatesInput.value);
            const portfolio = JSON.parse(portfolioInput.value);
            const npvLadder = JSON.parse(npvLadderInput.value);
            const exchangeRates = JSON.parse(exchangeRatesInput.value);

            const computedNPVs = {};
            let tableHTML = `
                <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>CCY Pair (CCY1/CCY2)</th>
                            <th>Tran ID</th>
                            <th>Exchange Rate</th>
                            <th>Maturity Month (YF)</th>
                            <th>Interest rate (CCY1)</th>
                            <th>Interest rate (CCY2)</th>
                            <th>Notional</th>
                            <th>Strike</th>
                            <th>Contract Amount Valued Today (CCY2)</th>
                            <th>Counter Amount Valued Today (CCY2)</th>
                            <th>NPV Value (CCY2)</th>
                            <th>CCY2/USD</th>
                            <th>NPV Value (CCY2/USD)</th>
                            <th>Total NPV Value (CCY2)</th>
                            <th>Contract Amount Valued Today (CCY1)</th>
                            <th>Counter Amount Valued Today (CCY1)</th>
                            <th>CCY1/USD</th>
                            <th>NPV Value (CCY1)</th>
                            <th>NPV Value (CCY1/USD)</th>
                            <th>Total NPV Value (CCY1)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            Object.keys(portfolio.forwardTransactionPerCcyPairs).forEach(ccyPair => {
                const transactions = portfolio.forwardTransactionPerCcyPairs[ccyPair];
                const ladderRates = Object.keys(npvLadder[ccyPair]).map(rate => parseFloat(rate));

                computedNPVs[ccyPair] = ladderRates.map(rate => {
                    let totalNPV = 0;

                    transactions.forEach(transaction => {
                        const maturityMonths = getMaturityMonths(transaction.valueDate);
                        const yfrace = getYearFraction(new Date(), new Date(transaction.valueDate), "actual/365");

                        const discountFactorBase = getDiscountFactor(ccyPair.split("/")[0], maturityMonths, interestRates);
                        const discountFactorQuote = getDiscountFactor(ccyPair.split("/")[1], maturityMonths, interestRates);

                        const contract = transaction.notional;
                        const counter = transaction.notional / transaction.rate;

                        const contractAmountToday = contract / (1 + discountFactorQuote * yfrace);
                        const counterAmountToday = counter / (1 + discountFactorBase * yfrace);
                        const counterAmountTodayInContractCcy = counterAmountToday * rate;

                        const contractAmountTodayInContractCcy1 = contractAmountToday / rate;

                        const npv = transaction.rmiType === "LHS"
                        ? contractAmountToday - counterAmountTodayInContractCcy
                        : counterAmountTodayInContractCcy - contractAmountToday;


                        const npv1 = transaction.rmiType === "LHS"
                        ? contractAmountTodayInContractCcy1 - counterAmountToday
                        : counterAmountToday - contractAmountTodayInContractCcy1;
                        
                        const ccy2USD = convertCurrency(1, ccyPair.split("/")[1], "USD", exchangeRates);
                        const ccy1USD = convertCurrency(1, ccyPair.split("/")[0], "USD", exchangeRates);
                        const npvUSD = convertCurrency(npv,ccyPair.split("/")[1],"USD", exchangeRates);
                        const npv1USD = convertCurrency(npv1,ccyPair.split("/")[0],"USD", exchangeRates);


                        totalNPV += npv;

                        const totalNpv1 = totalNPV/rate;

                        tableHTML += `
                            <tr>
                                <td>${ccyPair}</td>
                                <td>${transaction.tranId}</td>
                                <td>${rate.toFixed(4)}</td>
                                <td>${yfrace.toFixed(10)}</td>
                                <td>${discountFactorBase.toFixed(10)}</td>
                                <td>${discountFactorQuote.toFixed(10)}</td>
                                <td>${transaction.notional.toFixed(2)}</td>
                                <td>${transaction.rate.toFixed(4)}</td>
                                <td>${contractAmountToday.toFixed(2)}</td>
                                <td>${counterAmountTodayInContractCcy.toFixed(2)}</td>
                                <td>${npv.toFixed(2)}</td>
                                <td>${ccy2USD.toFixed(10)}</td>
                                <td>${npvUSD.toFixed(2)}</td>
                                <td>${totalNPV.toFixed(2)}</td>
                                <td>${counterAmountToday.toFixed(2)}</td>
                                <td>${contractAmountTodayInContractCcy1.toFixed(2)}</td>
                                <td>${ccy1USD.toFixed(10)}</td>
                                <td>${npv1.toFixed(2)}</td>
                                <td>${npv1USD.toFixed(2)}</td>
                                <td>${totalNpv1.toFixed(2)}</td>
                            </tr>
                        `;
                    });

                    return { rate, npv: totalNPV };
                });
            });

            tableHTML += `</tbody></table></div>`;
            tableContainer.innerHTML = tableHTML;

            if (chartInstance) {
                chartInstance.destroy();
            }

            const datasets = [];
            Object.keys(npvLadder).forEach(ccyPair => {
                const ladderData = Object.entries(npvLadder[ccyPair]).map(([r, n]) => ({ x: parseFloat(r), y: parseFloat(n) }));
                const computedData = computedNPVs[ccyPair].map(({ rate, npv }) => ({ x: rate, y: npv }));

                // Tính toán các chỉ số cho từng điểm
                const statsData = computePointwiseStats(ladderData, computedData);
                const lineColor = getRandomColor(); // Lưu màu ngẫu nhiên vào một biến
                datasets.push({
                    label: `${ccyPair} - Ladder`,
                    data: ladderData,
                    borderColor: lineColor,
                    showLine: true,
                    pointRadius: 3,
                    fill: false
                });

                datasets.push({
                    label: `${ccyPair} - Computed`,
                    data: computedData,
                    borderColor: lineColor,
                    borderDash: [5, 5],
                    showLine: true,
                    pointRadius: 3,
                    fill: false
                });

                // Stats dataset với đầy đủ điểm
                datasets.push({
                    label: `Stats - ${ccyPair}`,
                    data: statsData, // Mỗi điểm trong statsData chứa mae, relError, correlation riêng
                    borderColor: "transparent",
                    pointRadius: 3,
                    backgroundColor: "rgba(0,0,0,0)", 
                    showLine: false,
                    fill: false
                });
            });

            chartInstance = new Chart(npvChart, {
                type: "scatter",
                data: { datasets },
                options: {
                    plugins: {
                        legend: { position: "top" },
                        title: { display: true, text: "NPV Comparison" },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const dataset = context.dataset;
                                    const x = context.parsed.x;
                                    const y = context.parsed.y;

                                    if (dataset.label.includes("Ladder")) {
                                        return `${dataset.label}: Exchange Rate: ${x}, NPV: ${y}`;
                                    }
                                    if (dataset.label.includes("Computed")) {
                                        return `${dataset.label}: Exchange Rate: ${x}, NPV: ${y}`;
                                    }
                                    if (dataset.label.includes("Stats")) {
                                        const point = dataset.data[context.dataIndex];
                                        const mae = point.mae !== undefined ? point.mae.toFixed(2) : "N/A";
                                        const rel = point.relError !== undefined ? point.relError.toFixed(2) + "%" : "N/A";
                                        const corr = (point.correlation !== undefined && !isNaN(point.correlation)) 
                                            ? point.correlation.toFixed(3) 
                                            : "N/A";
                                        return [
                                            `Exchange Rate: ${x}`,
                                            `MAE: ${mae}`,
                                            `Rel Error: ${rel}`,
                                            `Correlation (0->i): ${corr}`
                                        ];
                                    }
                                    return `${dataset.label}: (${x}, ${y})`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { title: { display: true, text: "Exchange Rate" } },
                        y: { title: { display: true, text: "NPV Value (USD)" } }
                    }
                }
            });
        } catch (error) {
            console.error(error);
            alert("Invalid JSON input. Please check the format.");
        }
    });

    function computePointwiseStats(ladderData, computedData) {
        const n = ladderData.length;
        const statsData = [];
        for (let i = 0; i < n; i++) {
            const ladderY = ladderData[i].y;
            const compY = computedData[i].y;
            const mae = Math.abs(compY - ladderY);
            const relError = Math.abs((compY - ladderY) / ladderY) * 100;
            const correlation = calculateCorrelationCoefficient(ladderData.slice(0, i+1), computedData.slice(0, i+1));

            statsData.push({
                x: ladderData[i].x,
                y: ladderData[i].y,   // bạn có thể chọn hiển thị gì ở trục y; ở đây ta để y là ladderData[i].y
                mae,
                relError,
                correlation
            });
        }
        return statsData;
    }

    function calculateCorrelationCoefficient(ladderData, computedData) {
        const n = ladderData.length;
        if (n < 2) return NaN; // Không đủ dữ liệu để tính correlation
        
        let sumLadder = 0, sumComputed = 0, sumLadderSquared = 0, sumComputedSquared = 0, sumProduct = 0;
        for (let i = 0; i < n; i++) {
            const X = ladderData[i].y;
            const Y = computedData[i].y;
            sumLadder += X;
            sumComputed += Y;
            sumLadderSquared += X * X;
            sumComputedSquared += Y * Y;
            sumProduct += X * Y;
        }

        const numerator = n * sumProduct - sumLadder * sumComputed;
        const denominator = Math.sqrt((n * sumLadderSquared - sumLadder ** 2) * (n * sumComputedSquared - sumComputed ** 2));
        return denominator === 0 ? NaN : numerator / denominator;
    }

    function getYearFraction(startDate, endDate, convention = "actual/365") {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start) || isNaN(end)) {
            throw new Error("Invalid date format");
        }
        const actualDays = Math.round((end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
        if (convention === "actual/365") {
            return actualDays / 365;
        } else if (convention === "actual/actual") {
            const startYear = start.getFullYear();
            const endYear = end.getFullYear();
            const startYearDays = isLeapYear(startYear) ? 366 : 365;
            const endYearDays = isLeapYear(endYear) ? 366 : 365;

            const startYearEnd = new Date(startYear, 11, 31);
            const daysInStartYear = Math.max(0, Math.round((startYearEnd - start) / (1000 * 60 * 60 * 24)) + 1);
            const daysInEndYear = actualDays - daysInStartYear;

            return (daysInStartYear / startYearDays) + (daysInEndYear / endYearDays);
        } else {
            throw new Error("Unsupported day count convention. Use 'actual/365' or 'actual/actual'.");
        }
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function getMaturityMonths(valueDate) {
        const today = new Date();
        const maturityDate = new Date(valueDate);
        const months = (maturityDate.getFullYear() - today.getFullYear()) * 12 + (maturityDate.getMonth() - today.getMonth());
        return Math.max(months, 0);
    }

    function getDiscountFactor(currency, maturityMonths, interestRates) {
        const rates = interestRates.interestRateMap[currency]?.rates || [];
        const maturities = interestRates.interestRateMap[currency]?.maturities || [];
        if (!rates.length || !maturities.length) return 1;

        const maturityInYears = maturityMonths / 12;
        for (let i = 0; i < maturities.length - 1; i++) {
            const lowerMaturity = parseMaturity(maturities[i]);
            const upperMaturity = parseMaturity(maturities[i + 1]);

            if (maturityInYears >= lowerMaturity && maturityInYears <= upperMaturity) {
                const lowerRate = rates[i];
                const upperRate = rates[i + 1];
                const interpolatedRate =
                    lowerRate + ((upperRate - lowerRate) * (maturityInYears - lowerMaturity)) / (upperMaturity - lowerMaturity);
                // Dùng interpolatedRate làm discountFactor giả định
                return interpolatedRate;
            }
        }

        return 1;
    }

    function parseMaturity(m) {
        if (m.endsWith("M")) {
            return parseFloat(m.replace("M", "")) / 12;
        } else if (m.endsWith("Y")) {
            return parseFloat(m.replace("Y", ""));
        }
        return parseFloat(m) / 12;
    }

    function convertCurrency(amount, currency1, currency2, exchangeRates) {
        if (currency1 === currency2) return amount;

        const directRate = exchangeRates[`${currency1}/${currency2}`];
        if (directRate) {
            return amount * directRate;
        }

        const inverseRate = exchangeRates[`${currency2}/${currency1}`];
        if (inverseRate) {
            return amount / inverseRate;
        }

        const baseToCcy1 = exchangeRates[`AUD/${currency1}`] || (exchangeRates[`${currency1}/AUD`] ? 1 / exchangeRates[`${currency1}/AUD`] : null);
        const baseToCcy2 = exchangeRates[`AUD/${currency2}`] || (exchangeRates[`${currency2}/AUD`] ? 1 / exchangeRates[`${currency2}/AUD`] : null);

        if (baseToCcy1 && baseToCcy2) {
            const crossRate = baseToCcy2 / baseToCcy1;
            return amount * crossRate;
        }

        throw new Error(`Unable to find exchange rate for ${currency1} to ${currency2}.`);
    }

    function getRandomColor() {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgb(${r}, ${g}, ${b})`;
    }

});
