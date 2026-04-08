package com.chesspapa.demo.pgn;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PgnHistoryRepository extends JpaRepository<PgnHistory, Long> {
}
