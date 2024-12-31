// Hàm nội suy tuyến tính
function linearInterpolate(xs, ys, x) {
    // Giả sử xs đã được sort tăng dần
    // Tìm đoạn [xs[i], xs[i+1]] chứa x
    const n = xs.length;
    for (let i = 0; i < n - 1; i++) {
        if (x >= xs[i] && x <= xs[i + 1]) {
            // Thực hiện nội suy tuyến tính:
            // y = y_i + ((y_{i+1} - y_i)/(x_{i+1} - x_i)) * (x - x_i)
            const x_i = xs[i];
            const x_i1 = xs[i + 1];
            const y_i = ys[i];
            const y_i1 = ys[i + 1];

            return y_i + ((y_i1 - y_i) / (x_i1 - x_i)) * (x - x_i);
        }
    }
    // Nếu x nằm ngoài khoảng [min(xs), max(xs)], trả về null
    return null;
}

document.addEventListener("DOMContentLoaded", () => {
    const jsonInput = document.getElementById("jsonInput");
    const generateDataButton = document.getElementById("generateData");
    const chartCanvas = document.getElementById("chart");
    const interpolationTable = document.getElementById("interpolationTable").querySelector("tbody");


    generateDataButton.addEventListener("click", () => {
        try {
            // Lấy chuỗi JSON từ textarea và parse
            const rawData = JSON.parse(jsonInput.value);

            // Ví dụ JSON:
            // {
            //   "AUD/USD": {
            //       "0.468975": 34220.55005250349,
            //       "0.481481": 31826.457285136712,
            //        ...
            //   }
            // }
            //
            // Lấy tên cặp, ví dụ: "AUD/USD"
            const pairName = Object.keys(rawData)[0];
            const dataObject = rawData[pairName];

            // Chuyển đổi dataObject thành mảng [{exchangeRate, value}, ...]
            const data = Object.entries(dataObject).map(([rate, val]) => {
                return {
                    exchangeRate: parseFloat(rate),
                    value: parseFloat(val)
                };
            });

            // Sort theo exchangeRate
            data.sort((a, b) => a.exchangeRate - b.exchangeRate);

            const exchangeRates = data.map(d => d.exchangeRate);
            const values = data.map(d => d.value);

            // Tìm min và max
            const minRate = Math.min(...exchangeRates);
            const maxRate = Math.max(...exchangeRates);

            // Bước nhảy để vẽ nội suy
            const step = 0.0001;

            // Tạo mảng chứa dữ liệu nội suy
            const interpolatedData = [];
            for (let rate = minRate; rate <= maxRate; rate = parseFloat((rate + step).toFixed(4))) {
                const interpolatedValue = linearInterpolate(exchangeRates, values, rate);
                if (interpolatedValue !== null) {
                    interpolatedData.push({ x: rate.toFixed(4), y: interpolatedValue });
                }
            }

            // Dữ liệu gốc để vẽ
            const originalData = exchangeRates.map((x, i) => ({ x, y: values[i] }));

            // Xóa chart cũ (nếu có) bằng cách tạo node canvas mới (hoặc có thể tái sử dụng chart)
            chartCanvas.getContext("2d").clearRect(0, 0, chartCanvas.width, chartCanvas.height);

            // Tạo chart sử dụng Chart.js
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
                            text: `Linear Interpolation Chart for ${pairName}`
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
