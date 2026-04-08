package com.chesspapa.demo.pgn;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PgnHistoryService {

    private final PgnHistoryRepository repository;

    public PgnHistoryService(PgnHistoryRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public PgnHistoryResponse save(SavePgnRequest request) {
        PgnHistory entry = new PgnHistory();
        entry.setPgn(request.getPgn().trim());
        entry.setDepth(request.getDepth() == null ? 10 : request.getDepth());
        entry.setMoveCount(request.getMoveCount() == null ? 0 : request.getMoveCount());

        PgnHistory saved = repository.save(entry);
        return PgnHistoryResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<PgnHistoryResponse> getRecent(int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        return repository
            .findAll(PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt")))
            .stream()
            .map(PgnHistoryResponse::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public PgnHistoryResponse getById(Long id) {
        PgnHistory found = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("PGN entry not found for id " + id));
        return PgnHistoryResponse.fromEntity(found);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("PGN entry not found for id " + id);
        }
        repository.deleteById(id);
    }
}
