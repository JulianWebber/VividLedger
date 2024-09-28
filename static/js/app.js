document.addEventListener('DOMContentLoaded', () => {
    const transactionList = document.getElementById('transaction-list');
    const transactionForm = document.getElementById('transaction-form');
    const dateInput = document.getElementById('date');
    const nameInput = document.getElementById('name');
    const amountInput = document.getElementById('amount');
    const addButton = document.getElementById('add-transaction');
    let editingId = null;

    // Fetch and display transactions
    function fetchTransactions() {
        fetch('/api/transactions')
            .then(response => response.json())
            .then(transactions => {
                transactionList.innerHTML = '';
                const groupedTransactions = groupTransactionsByDate(transactions);
                Object.entries(groupedTransactions).forEach(([date, transactions]) => {
                    const dateGroup = document.createElement('div');
                    dateGroup.classList.add('mb-4');
                    dateGroup.innerHTML = `<h3 class="text-lg font-bold mb-2">${date}</h3>`;
                    transactions.forEach(transaction => {
                        dateGroup.appendChild(createTransactionElement(transaction));
                    });
                    transactionList.appendChild(dateGroup);
                });
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
                <p class="font-bold">${transaction.name}</p>
                <p class="text-gray-600">$${transaction.amount.toFixed(2)}</p>
            </div>
            <div>
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

    // Initial fetch
    fetchTransactions();
});
