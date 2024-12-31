// Custom Cubic Spline Implementation
function cubicSplineInterpolate(xs, ys, x) {
    const n = xs.length - 1;
    const h = new Array(n);
    const al = new Array(n);
    const l = new Array(n + 1);
    const mu = new Array(n);
    const z = new Array(n + 1);
    const c = new Array(n + 1).fill(0);
    const b = new Array(n);
    const d = new Array(n);
    const a = ys.slice();

    for (let i = 0; i < n; i++) {
        h[i] = xs[i + 1] - xs[i];
    }

    for (let i = 1; i < n; i++) {
        al[i] = (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);
    }

    l[0] = 1;
    mu[0] = 0;
    z[0] = 0;

    for (let i = 1; i < n; i++) {
        l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
        mu[i] = h[i] / l[i];
        z[i] = (al[i] - h[i - 1] * z[i - 1]) / l[i];
    }

    l[n] = 1;
    z[n] = 0;
    c[n] = 0;

    for (let j = n - 1; j >= 0; j--) {
        c[j] = z[j] - mu[j] * c[j + 1];
        b[j] = (a[j + 1] - a[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
        d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
    }

    for (let i = 0; i < n; i++) {
        if (x >= xs[i] && x <= xs[i + 1]) {
            const dx = x - xs[i];
            return a[i] + b[i] * dx + c[i] * dx ** 2 + d[i] * dx ** 3;
        }
    }
    return null; // Out of bounds
}

document.addEventListener("DOMContentLoaded", () => {
    const jsonInput = document.getElementById("jsonInput");
    const generateDataButton = document.getElementById("generateData");
    const chartCanvas = document.getElementById("chart");
    const interpolationTable = document.getElementById("interpolationTable").querySelector("tbody");

    generateDataButton.addEventListener("click", () => {
        try {
            // Parse input JSON
            const jsonData = JSON.parse(jsonInput.value);

            // Extract and sort data
            const data = Object.values(jsonData.reportInfo).map(item => ({
                exchangeRate: parseFloat(item.exchangeRate),
                value: parseFloat(item.value)
            }));
            data.sort((a, b) => a.exchangeRate - b.exchangeRate);

            const exchangeRates = data.map(d => d.exchangeRate);
            const values = data.map(d => d.value);

            // Generate interpolated data
            const step = 0.0001;
            const minRate = Math.min(...exchangeRates);
            const maxRate = Math.max(...exchangeRates);

            const interpolatedData = [];
            for (let rate = minRate; rate <= maxRate; rate = parseFloat((rate + step).toFixed(4))) {
                const interpolatedValue = cubicSplineInterpolate(exchangeRates, values, rate);
                interpolatedData.push({ x: rate, y: interpolatedValue });
            }

            // Generate chart data
            const originalData = exchangeRates.map((x, i) => ({ x, y: values[i] }));

            // Create Chart.js chart
            new Chart(chartCanvas, {
                type: "scatter",
                data: {
                    datasets: [
                        {
                            label: "Original Data",
                            data: originalData,
                            backgroundColor: "red",
                            showLine: true,
                            borderColor: "red",
                            borderWidth: 2,
                            tension: 0.4
                        },
                        {
                            label: "Interpolated Data",
                            data: interpolatedData,
                            backgroundColor: "blue",
                            showLine: true,
                            borderColor: "blue",
                            borderWidth: 1,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: "top"
                        },
                        title: {
                            display: true,
                            text: "Cubic Spline Interpolation Chart"
                        }
                    },
                    scales: {
                        x: {
                            type: "linear",
                            position: "bottom",
                            title: {
                                display: true,
                                text: "Exchange Rate"
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: "Value"
                            }
                        }
                    }
                }
            });

            // Xóa nội dung cũ trong bảng (nếu có)
            interpolationTable.innerHTML = "";

            // Đẩy dữ liệu nội suy vào bảng
            interpolatedData.forEach(point => {
                const row = interpolationTable.insertRow();
                const rateCell = row.insertCell(0);
                const valueCell = row.insertCell(1);

                rateCell.textContent = point.x;
                valueCell.textContent = point.y;
            });
            
        } catch (error) {
            console.error("Error:", error.message);
            alert("An error occurred: " + error.message);
        }
    });
});
