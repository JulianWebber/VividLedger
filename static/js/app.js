document.addEventListener('DOMContentLoaded', () => {
    const transactionList = document.getElementById('transaction-list');
    const transactionForm = document.getElementById('transaction-form');
    const dateInput = document.getElementById('date');
    const nameInput = document.getElementById('name');
    const amountInput = document.getElementById('amount');
    const addButton = document.getElementById('add-transaction');
    const saveButton = document.getElementById('save-transactions');
    const loadButton = document.getElementById('load-transactions');
    const spendingChart = document.getElementById('spending-chart').getContext('2d');
    let editingId = null;
    let chart = null;

    // Fetch and display transactions
    function fetchTransactions() {
        fetch('/api/transactions')
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
                <button class="btn btn-blue edit-btn" data-id="${transaction.id}">Edit</button>
                <button class="btn btn-red delete-btn" data-id="${transaction.id}">Delete</button>
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
        if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            const transactionElement = e.target.closest('div');
            const name = transactionElement.querySelector('p').textContent;
            const amount = transactionElement.querySelector('p:nth-child(2)').textContent.slice(1);
            const date = transactionElement.closest('div').querySelector('h3').textContent;

            dateInput.value = date;
            nameInput.value = name;
            amountInput.value = amount;
            editingId = id;
            addButton.textContent = 'Update Transaction';
        }
    });

    // Delete transaction
    transactionList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            fetch(`/api/transactions/${id}`, {
                method: 'DELETE',
            })
            .then(() => {
                fetchTransactions();
            });
        }
    });

    // Save transactions
    saveButton.addEventListener('click', () => {
        fetch('/api/transactions')
            .then(response => response.json())
            .then(transactions => {
                const blob = new Blob([JSON.stringify(transactions)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'transactions.json';
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
                .then(() => {
                    fetchTransactions();
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
            chart.destroy();
        }

        chart = new Chart(spendingChart, {
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

    // Initial fetch
    fetchTransactions();
});
