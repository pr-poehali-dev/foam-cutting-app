CREATE TABLE t_p7983100_foam_cutting_app.material_logs (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    operator_id INTEGER NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'кг',
    notes TEXT,
    logged_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ml_order FOREIGN KEY (order_id) REFERENCES t_p7983100_foam_cutting_app.orders(id),
    CONSTRAINT fk_ml_operator FOREIGN KEY (operator_id) REFERENCES t_p7983100_foam_cutting_app.users(id)
)