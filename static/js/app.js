document.addEventListener('DOMContentLoaded', () => {
    const transactionList = document.getElementById('transaction-list');
    const transactionForm = document.getElementById('transaction-form');
    const dateInput = document.getElementById('date');
    const nameInput = document.getElementById('name');
    const amountInput = document.getElementById('amount');
    const addButton = document.getElementById('add-transaction');
    const saveButton = document.getElementById('save-transactions');
    const loadButton = document.getElementById('load-transactions');
    const spendingChart = document.getElementById('spending-chart');
    const newButton = document.getElementById('new-transaction');
    let editingId = null;
    let chart = null;

    // Fetch and display transactions
    function fetchTransactions() {
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
                updateChart(groupedTransactions);
            });
    }

    // Group transactions by date
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

    // Create transaction element
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
                <button class="btn btn-blue edit-btn" data-id="${transaction.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-red delete-btn" data-id="${transaction.id}">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        `;
        return element;
    }

    // Add or update transaction
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

    // Edit transaction
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

    // Delete transaction
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

    // Save transactions
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

    // Load transactions
    loadButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (event) => {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
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
                    alert('Failed to load transactions');
                });
            };
            reader.readAsText(file);
        };
        input.click();
    });

    // Update chart
    function updateChart(groupedTransactions) {
        const dates = Object.keys(groupedTransactions);
        const amounts = dates.map(date => 
            groupedTransactions[date].reduce((sum, transaction) => sum + transaction.amount, 0)
        );

        if (chart) {
            chart.data.labels = dates;
            chart.data.datasets[0].data = amounts;
            chart.update();
        } else {
            initChart(dates, amounts);
        }
    }

    function initChart(dates, amounts) {
        const ctx = document.getElementById('spending-chart').getContext('2d');
        chart = new Chart(ctx, {
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

    // New transaction button
    newButton.addEventListener('click', () => {
        transactionForm.reset();
        editingId = null;
        addButton.textContent = 'Add Transaction';
    });

    // Initial fetch
    fetchTransactions();
});
