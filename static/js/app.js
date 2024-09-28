document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    console.log('Chart.js loaded:', typeof Chart !== 'undefined');

    const transactionList = document.getElementById('transaction-list');
    const transactionForm = document.getElementById('transaction-form');
    const dateInput = document.getElementById('date');
    const nameInput = document.getElementById('name');
    const amountInput = document.getElementById('amount');
    const addButton = document.getElementById('add-transaction');
    const saveButton = document.getElementById('save-transactions');
    const loadButton = document.getElementById('load-transactions');
    const spendingChart = document.getElementById('spending-chart');
    const categoryChart = document.getElementById('category-chart');
    const newButton = document.getElementById('new-transaction');
    let editingId = null;
    let lineChart = null;
    let pieChart = null;

    function fetchTransactions() {
        console.log('Fetching transactions...');
        return fetch('/api/transactions')
            .then(response => response.json())
            .then(transactions => {
                transactionList.innerHTML = '';
                const groupedTransactions = groupTransactionsByDate(transactions);
                let totalSpending = 0;
                Object.entries(groupedTransactions).forEach(([date, transactions]) => {
                    const dateGroup = document.createElement('div');
                    dateGroup.classList.add('mb-4');
                    let dailyTotal = 0;
                    dateGroup.innerHTML = `<h3 class="text-lg font-bold mb-2">${date}</h3>`;
                    transactions.forEach(transaction => {
                        dateGroup.appendChild(createTransactionElement(transaction));
                        dailyTotal += transaction.amount;
                    });
                    totalSpending += dailyTotal;
                    dateGroup.innerHTML += `<p class="text-right font-bold">Daily Total: $${dailyTotal.toFixed(2)}</p>`;
                    transactionList.appendChild(dateGroup);
                });
                document.getElementById('monthly-total').textContent = `$${totalSpending.toFixed(2)}`;
                updateCharts(groupedTransactions, transactions);
            });
    }

    function groupTransactionsByDate(transactions) {
        return transactions.reduce((groups, transaction) => {
            const date = transaction.date;
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(transaction);
            return groups;
        }, {});
    }

    function createTransactionElement(transaction) {
        const element = document.createElement('div');
        element.classList.add('flex', 'justify-between', 'items-center', 'bg-white', 'p-4', 'rounded-lg', 'shadow', 'mb-2');
        element.innerHTML = `
            <div>
                <p class="font-bold text-blue-600">${transaction.name}</p>
                <p class="text-gray-600">${transaction.date}</p>
            </div>
            <div>
                <p class="text-green-600 font-bold">$${transaction.amount.toFixed(2)}</p>
                <div class="button-container">
                    <button class="btn btn-purple edit-btn" data-id="${transaction.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-red delete-btn" data-id="${transaction.id}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>
        `;
        return element;
    }

    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const transaction = {
            date: dateInput.value,
            name: nameInput.value,
            amount: parseFloat(amountInput.value)
        };

        const url = editingId ? `/api/transactions/${editingId}` : '/api/transactions';
        const method = editingId ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transaction),
        })
        .then(response => response.json())
        .then(() => {
            fetchTransactions();
            transactionForm.reset();
            editingId = null;
            addButton.textContent = 'Add Transaction';
        });
    });

    transactionList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const transactionElement = editBtn.closest('.flex');
            const name = transactionElement.querySelector('.font-bold.text-blue-600').textContent;
            const date = transactionElement.querySelector('.text-gray-600').textContent;
            const amount = transactionElement.querySelector('.text-green-600.font-bold').textContent.slice(1);

            dateInput.value = date;
            nameInput.value = name;
            amountInput.value = amount;
            editingId = id;
            addButton.textContent = 'Update Transaction';
        }
    });

    transactionList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('Are you sure you want to delete this transaction?')) {
                fetch(`/api/transactions/${id}`, {
                    method: 'DELETE',
                })
                .then(() => {
                    fetchTransactions();
                });
            }
        }
    });

    saveButton.addEventListener('click', () => {
        const defaultFilename = 'transactions.json';
        const filename = prompt('Enter a filename for saving transactions:', defaultFilename) || defaultFilename;
        fetch('/api/transactions')
            .then(response => response.json())
            .then(transactions => {
                const blob = new Blob([JSON.stringify(transactions)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
    });

    loadButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const transactions = JSON.parse(e.target.result);
                        fetch('/api/transactions/bulk', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(transactions),
                        })
                        .then(response => {
                            if (response.ok) {
                                return fetchTransactions();
                            } else {
                                throw new Error('Failed to load transactions');
                            }
                        })
                        .then(() => {
                            alert('Transactions loaded successfully');
                        })
                        .catch(error => {
                            console.error('Error:', error);
                            alert('Failed to load transactions: ' + error.message);
                        });
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                        alert('Failed to parse the selected file. Please ensure it is a valid JSON file.');
                    }
                };
                reader.readAsText(file);
            } else {
                alert('No file selected. Please select a valid JSON file.');
            }
        };
        input.click();
    });

    function updateCharts(groupedTransactions, allTransactions) {
        console.log('Updating charts with data:', groupedTransactions);
        updateLineChart(groupedTransactions);
        updatePieChart(allTransactions);
    }

    function updateLineChart(groupedTransactions) {
        const dates = Object.keys(groupedTransactions);
        const amounts = dates.map(date => 
            groupedTransactions[date].reduce((sum, transaction) => sum + transaction.amount, 0)
        );

        if (lineChart) {
            lineChart.data.labels = dates;
            lineChart.data.datasets[0].data = amounts;
            lineChart.update();
        } else {
            initLineChart(dates, amounts);
        }
    }

    function initLineChart(dates, amounts) {
        console.log('Initializing line chart with dates:', dates, 'and amounts:', amounts);
        const ctx = document.getElementById('spending-chart').getContext('2d');
        lineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Daily Spending',
                    data: amounts,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount ($)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    }

    function updatePieChart(transactions) {
        const categories = {};
        transactions.forEach(transaction => {
            const category = transaction.name.split(' ')[0];
            if (categories[category]) {
                categories[category] += transaction.amount;
            } else {
                categories[category] = transaction.amount;
            }
        });

        const labels = Object.keys(categories);
        const data = Object.values(categories);

        if (pieChart) {
            pieChart.data.labels = labels;
            pieChart.data.datasets[0].data = data;
            pieChart.update();
        } else {
            initPieChart(labels, data);
        }
    }

    function initPieChart(labels, data) {
        console.log('Initializing pie chart with labels:', labels, 'and data:', data);
        const ctx = document.getElementById('category-chart').getContext('2d');
        pieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgb(255, 99, 132)',
                        'rgb(54, 162, 235)',
                        'rgb(255, 205, 86)',
                        'rgb(75, 192, 192)',
                        'rgb(153, 102, 255)',
                        'rgb(255, 159, 64)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Spending by Category'
                    }
                }
            }
        });
    }

    newButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to start a new ledger? This will clear all current transactions.')) {
            fetch('/api/transactions', { method: 'DELETE' })
                .then(response => {
                    if (response.ok) {
                        return fetchTransactions();
                    } else {
                        return response.text().then(text => {
                            throw new Error('Failed to clear transactions: ' + text);
                        });
                    }
                })
                .then(() => {
                    transactionForm.reset();
                    editingId = null;
                    addButton.textContent = 'Add Transaction';
                    alert('New ledger started. All transactions have been cleared.');
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Failed to clear transactions: ' + error.message);
                });
        }
    });

    fetchTransactions();
});
