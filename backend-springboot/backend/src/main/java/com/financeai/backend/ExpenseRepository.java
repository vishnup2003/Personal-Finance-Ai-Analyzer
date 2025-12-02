package com.financeai.backend;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface ExpenseRepository extends MongoRepository<Expense, String> {
    // abhi basic CRUD ke liye kuch extra nahi chahiye
}
