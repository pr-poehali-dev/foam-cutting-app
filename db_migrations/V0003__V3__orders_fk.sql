ALTER TABLE t_p7983100_foam_cutting_app.orders
    ADD CONSTRAINT fk_orders_assigned FOREIGN KEY (assigned_to) REFERENCES t_p7983100_foam_cutting_app.users(id) ON UPDATE CASCADE,
    ADD CONSTRAINT fk_orders_created FOREIGN KEY (created_by) REFERENCES t_p7983100_foam_cutting_app.users(id) ON UPDATE CASCADE