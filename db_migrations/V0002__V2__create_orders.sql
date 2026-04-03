CREATE TABLE t_p7983100_foam_cutting_app.orders (
    id SERIAL PRIMARY KEY,
    number VARCHAR(30) UNIQUE NOT NULL,
    client VARCHAR(200) NOT NULL,
    material VARCHAR(50) NOT NULL,
    thickness INTEGER NOT NULL,
    dimensions VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    assigned_to INTEGER,
    due_date DATE,
    comment TEXT,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)