from flask import Blueprint, jsonify, request, render_template
from flask_login import login_required, current_user
from models import Transaction
from app import db

main = Blueprint('main', __name__)

@main.route('/')
@login_required
def index():
    return render_template('index.html')

@main.route('/api/transactions', methods=['GET'])
@login_required
def get_transactions():
    transactions = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.desc()).all()
    return jsonify([t.to_dict() for t in transactions])

@main.route('/api/transactions', methods=['POST'])
@login_required
def add_transaction():
    data = request.json
    new_transaction = Transaction(
        date=data['date'],
        name=data['name'],
        amount=data['amount'],
        user_id=current_user.id
    )
    db.session.add(new_transaction)
    db.session.commit()
    return jsonify(new_transaction.to_dict()), 201

@main.route('/api/transactions/<int:id>', methods=['PUT'])
@login_required
def update_transaction(id):
    transaction = Transaction.query.get_or_404(id)
    if transaction.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    transaction.date = data['date']
    transaction.name = data['name']
    transaction.amount = data['amount']
    db.session.commit()
    return jsonify(transaction.to_dict())

@main.route('/api/transactions/<int:id>', methods=['DELETE'])
@login_required
def delete_transaction(id):
    transaction = Transaction.query.get_or_404(id)
    if transaction.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(transaction)
    db.session.commit()
    return '', 204

@main.route('/api/transactions/bulk', methods=['POST'])
@login_required
def bulk_import_transactions():
    transactions = request.json
    for transaction_data in transactions:
        new_transaction = Transaction(
            date=transaction_data['date'],
            name=transaction_data['name'],
            amount=transaction_data['amount'],
            user_id=current_user.id
        )
        db.session.add(new_transaction)
    db.session.commit()
    return jsonify({'message': 'Transactions imported successfully'}), 201
