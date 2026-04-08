package com.chesspapa.demo.pgn;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@Validated
@RestController
@RequestMapping("/api/pgn-history")
public class PgnHistoryController {

    private final PgnHistoryService service;

    public PgnHistoryController(PgnHistoryService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<PgnHistoryResponse> create(@Valid @RequestBody SavePgnRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.save(request));
    }

    @GetMapping
    public List<PgnHistoryResponse> getRecent(
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        return service.getRecent(limit);
    }

    @GetMapping("/{id}")
    public PgnHistoryResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
