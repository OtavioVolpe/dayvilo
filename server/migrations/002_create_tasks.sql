CREATE TABLE tasks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  notes TEXT NULL,
  due_date DATE NULL,
  scheduled_time TIME NULL,
  is_priority BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('pending', 'completed', 'skipped') NOT NULL DEFAULT 'pending',
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY tasks_user_date_order (user_id, due_date, sort_order, id),
  CONSTRAINT tasks_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT tasks_title_not_empty CHECK (CHAR_LENGTH(TRIM(title)) > 0),
  CONSTRAINT tasks_priority_boolean CHECK (is_priority IN (0, 1)),
  CONSTRAINT tasks_time_of_day CHECK (
    scheduled_time IS NULL OR (scheduled_time >= '00:00:00' AND scheduled_time < '24:00:00')
  ),
  CONSTRAINT tasks_completion_consistent CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
