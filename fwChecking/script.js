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
                <table>
                    <thead>
                        <tr>
                            <th>CCY Pair</th>
                            <th>Tran ID</th>
                            <th>Exchange Rate</th>
                            <th>Maturity Month</th>
                            <th>Discount Factor (Base CCY)</th>
                            <th>Discount Factor (Quote CCY)</th>
                            <th>Notional</th>
                            <th>Strike</th>
                            <th>Contract Amount Valued Today</th>
                            <th>Counter Amount Valued Today</th>
                            <th>Contract Amount Valued Today (USD)</th>
                            <th>Counter Amount Valued Today (USD)</th>
                            <th>NPV Value (Calc)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // Process each ccyPair in the portfolio
            Object.keys(portfolio.forwardTransactionPerCcyPairs).forEach(ccyPair => {
                const transactions = portfolio.forwardTransactionPerCcyPairs[ccyPair];
                const ladderRates = Object.keys(npvLadder[ccyPair]).map(rate => parseFloat(rate));

                computedNPVs[ccyPair] = ladderRates.map(rate => {
                    let totalNPV = 0;

                    transactions.forEach(transaction => {
                        const maturityMonths = getMaturityMonths(transaction.valueDate);

                        const yfrace = getYearFraction(new Date(), new Date(transaction.valueDate) );

                        // Discount Factors
                        const discountFactorBase = getDiscountFactor(ccyPair.split("/")[0], maturityMonths, interestRates);
                        const discountFactorQuote = getDiscountFactor(ccyPair.split("/")[1], maturityMonths, interestRates);

                        // Convert notional to USD
                        //const contract = transaction.rmiType === "LHS"
                        //        ? transaction.notional
                        //        : -transaction.notional;
                        const contract = transaction.notional;//convertToUSD(transaction.notional, ccyPair.split("/")[1], exchangeRates);
                        //const counterToUSD = transaction.rmiType === "LHS"
                        //    ? contractToUSD * rate
                        //    : contractToUSD / rate;
                        const counter = transaction.notional* (1/transaction.rate);
                        //convertCurrency(transaction.notional,ccyPair.split("/")[1], ccyPair.split("/")[0],exchangeRates);
                        //transaction.notional* (1/transaction.rate);

                        // Calculate NPV
                        const contractAmountToday = contract/(1+discountFactorBase*yfrace);
                        const counterAmountToday = counter/(1+discountFactorQuote*yfrace);
                        const contractAmountTodayUSD = convertCurrency(contractAmountToday,ccyPair.split("/")[1],"USD", exchangeRates); //convertToUSD(contractAmo untToday,ccyPair.split("/")[1],exchangeRates);
                        const counterAmountInContract = counterAmountToday* rate;
                        const counterAmountTodayUSD = convertCurrency(counterAmountInContract,ccyPair.split("/")[1],"USD", exchangeRates);//convertToUSD(counterAmountToday*rate,ccyPair.split("/")[1],exchangeRates);
                        const npv = transaction.rmiType === "LHS"
                            ? contractAmountTodayUSD - counterAmountTodayUSD
                            : counterAmountTodayUSD - contractAmountTodayUSD;

                        totalNPV += npv;

                        // Add to table
                        tableHTML += `
                            <tr>
                                <td>${ccyPair}</td>
                                <td>${transaction.tranId}</td>
                                <td>${rate.toFixed(4)}</td>
                                <td>${yfrace.toFixed(6)}</td>
                                <td>${discountFactorBase.toFixed(6)}</td>
                                <td>${discountFactorQuote.toFixed(6)}</td>
                                <td>${transaction.notional.toFixed(2)}</td>
                                <td>${transaction.rate.toFixed(4)}</td>
                                <td>${contractAmountToday.toFixed(2)}</td>
                                <td>${counterAmountToday.toFixed(2)}</td>
                                <td>${contractAmountTodayUSD.toFixed(2)}</td>
                                <td>${counterAmountTodayUSD.toFixed(2)}</td>
                                <td>${npv.toFixed(2)}</td>
                            </tr>
                        `;
                    });

                    return { rate, npv: totalNPV };
                });
            });

            tableHTML += `</tbody></table>`;
            tableContainer.innerHTML = tableHTML;

            // Prepare data for Chart.js
            const datasets = [];
            Object.keys(npvLadder).forEach(ccyPair => {
                // Original NPV from ladder
                const ladderData = Object.entries(npvLadder[ccyPair]).map(([rate, npv]) => ({
                    x: parseFloat(rate),
                    y: parseFloat(npv)
                }));

                // Computed NPV
                const computedData = computedNPVs[ccyPair].map(({ rate, npv }) => ({
                    x: rate,
                    y: npv
                }));

                // Add datasets
                datasets.push({
                    label: `${ccyPair} - Ladder`,
                    data: ladderData,
                    borderColor: getRandomColor(),
                    showLine: true,
                    pointRadius: 3,
                    fill: false
                });

                datasets.push({
                    label: `${ccyPair} - Computed`,
                    data: computedData,
                    borderColor: getRandomColor(),
                    borderDash: [5, 5],
                    showLine: true,
                    pointRadius: 3,
                    fill: false
                });
            });

            // Draw Chart.js scatter plot
            new Chart(npvChart, {
                type: "scatter",
                data: { datasets },
                options: {
                    plugins: {
                        legend: { position: "top" },
                        title: { display: true, text: "NPV Comparison" }
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
    //   console.log("Start:"+start+"|End:"+end+"|actual day:"+actualDays);
    function getYearFraction(startDate, endDate, convention = "actual/365") {
        // Chuyển đổi ngày về dạng Date, bỏ qua giờ
        const start = new Date(startDate);
        const end = new Date(endDate);
    
        // Kiểm tra xem ngày có hợp lệ hay không
        if (isNaN(start) || isNaN(end)) {
            throw new Error("Invalid date format");
        }
    
        // Tính toán số ngày thực tế giữa 2 ngày, không ảnh hưởng bởi giờ
        const actualDays = Math.round((end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)); 
    
        if (convention === "actual/365") {
            // Sử dụng công thức Actual/365
            return actualDays / 365;
        } else if (convention === "actual/actual") {
            // Sử dụng công thức Actual/Actual
            const startYear = start.getFullYear();
            const endYear = end.getFullYear();
    
            const startYearDays = isLeapYear(startYear) ? 366 : 365;
            const endYearDays = isLeapYear(endYear) ? 366 : 365;
    
            const startYearEnd = new Date(startYear, 11, 31); // Ngày 31 tháng 12 của năm bắt đầu
            const daysInStartYear = Math.max(0, Math.round((startYearEnd - start) / (1000 * 60 * 60 * 24)) + 1);
    
            const daysInEndYear = actualDays - daysInStartYear;
    
            return (
                (daysInStartYear / startYearDays) +
                (daysInEndYear / endYearDays)
            );
        } else {
            throw new Error("Unsupported day count convention. Use 'actual/365' or 'actual/actual'.");
        }
    }
    
    // Helper function để xác định năm nhuận
    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }
    
    // Helper function to determine if a year is a leap year
    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function getMaturityMonths(valueDate) {
        const today = new Date();
        const maturityDate = new Date(valueDate);
        const months = (maturityDate.getFullYear() - today.getFullYear()) * 12 + (maturityDate.getMonth() - today.getMonth());
        return Math.max(months, 0); // Ensure non-negative
    }

    function getDiscountFactor(currency, maturityMonths, interestRates) {
        const rates = interestRates.interestRateMap[currency]?.rates || [];
        const maturities = interestRates.interestRateMap[currency]?.maturities || [];
        if (!rates.length || !maturities.length) return 1;
    
        // Convert maturity months to years for comparison
        const maturityInYears = maturityMonths / 12;
    
        // Loop through maturities to find the correct interval for interpolation
        for (let i = 0; i < maturities.length - 1; i++) {
            const lowerMaturity = parseFloat(maturities[i].replace(/[MY]/, "")) / (maturities[i].endsWith("M") ? 12 : 1);
            const upperMaturity = parseFloat(maturities[i + 1].replace(/[MY]/, "")) / (maturities[i + 1].endsWith("M") ? 12 : 1);
    
            if (maturityInYears >= lowerMaturity && maturityInYears <= upperMaturity) {
                const lowerRate = rates[i];
                const upperRate = rates[i + 1];
    
                // Linear interpolation for the interest rate
                const interpolatedRate =
                    lowerRate + ((upperRate - lowerRate) * (maturityInYears - lowerMaturity)) / (upperMaturity - lowerMaturity);
    
                // Correct calculation for discount factor: exp(-rate * maturityInYears)
                const discountFactor = interpolatedRate;//Math.exp(-interpolatedRate * maturityMonths / 12);
              
    
                return discountFactor;
            }
        }
    
        // If no matching interval is found, return 1 (default discount factor)
        return 1;
    }

    function convertToUSD(amount, currency, exchangeRates) {
        // Tìm tỷ giá trực tiếp từ currency sang USD
        const directRate = exchangeRates[`${currency}/USD`];
        if (directRate) {
            // Nếu có tỷ giá trực tiếp, nhân với amount
            return amount * directRate;
        }
    
        // Tìm tỷ giá chéo (Cross Rate)
        const usdToCurrency = Object.keys(exchangeRates).find(key => key.startsWith("USD/") && key.endsWith(currency));
        const baseToCurrency = Object.keys(exchangeRates).find(key => key.startsWith("AUD/") && key.endsWith(currency));
        const baseToUsd = exchangeRates["AUD/USD"];
    
        if (usdToCurrency) {
            // Nếu có tỷ giá USD/XXX, sử dụng đảo ngược của nó
            const crossRate = 1 / exchangeRates[usdToCurrency];
            return amount * crossRate;
        } else if (baseToCurrency && baseToUsd) {
            // Nếu có tỷ giá AUD/XXX, tính tỷ giá chéo từ AUD/USD
            const crossRate = exchangeRates[baseToCurrency] / baseToUsd;
            return amount * crossRate;
        } else {
            // Nếu không có tỷ giá nào, throw error
            throw new Error(`Exchange rate for ${currency}/USD or cross rate is not available.`);
        }
    }

    function convertCurrency(amount, currency1, currency2, exchangeRates) {
        if (currency1 === currency2) return amount; // Trường hợp không cần chuyển đổi
    
        // 1. Tìm tỷ giá trực tiếp
        const directRate = exchangeRates[`${currency1}/${currency2}`];
        if (directRate) {
            return amount * directRate; // Nếu có tỷ giá trực tiếp
        }
    
        // 2. Tìm tỷ giá ngược (currency2/currency1) và đảo ngược
        const inverseRate = exchangeRates[`${currency2}/${currency1}`];
        if (inverseRate) {
            return amount / inverseRate; // Đảo ngược tỷ giá
        }
    
        // 3. Tính tỷ giá chéo qua AUD hoặc USD
        const baseToCurrency1 = exchangeRates[`AUD/${currency1}`] || (1 / exchangeRates[`${currency1}/AUD`]);
        const baseToCurrency2 = exchangeRates[`AUD/${currency2}`] || (1 / exchangeRates[`${currency2}/AUD`]);
    
        if (baseToCurrency1 && baseToCurrency2) {
            const crossRate = baseToCurrency2 / baseToCurrency1;
            return amount * crossRate; // Tính tỷ giá chéo
        }
    
        // 4. Nếu không tìm thấy tỷ giá nào phù hợp
        throw new Error(`Unable to find exchange rate for ${currency1} to ${currency2}.`);
    }

    function getRandomColor() {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgb(${r}, ${g}, ${b})`;
    }
});
