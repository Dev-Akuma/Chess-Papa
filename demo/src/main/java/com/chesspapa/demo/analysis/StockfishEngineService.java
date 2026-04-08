package com.chesspapa.demo.analysis;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.file.Paths;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class StockfishEngineService {

    @Value("${stockfish.path:stockfish/stockfish-windows-x86-64-avx2.exe}")
    private String stockfishPath;

    private Process engineProcess;
    private BufferedWriter engineInput;
    private BufferedReader engineOutput;

    public synchronized void start() throws IOException {
        if (isRunning()) {
            return;
        }

        // Resolve stockfish path relative to working directory
        String resolvedPath = stockfishPath;
        File stockfishFile = new File(resolvedPath);
        if (!stockfishFile.exists()) {
            // Try one level up (if running from demo directory)
            stockfishFile = new File("..", resolvedPath);
        }
        if (!stockfishFile.exists()) {
            // Try absolute path from project root
            stockfishFile = new File(Paths.get("").toAbsolutePath().getParent().toFile(), resolvedPath);
        }

        if (!stockfishFile.exists()) {
            throw new IOException("Stockfish binary not found at: " + stockfishFile.getAbsolutePath());
        }

        engineProcess = new ProcessBuilder(stockfishFile.getAbsolutePath()).start();
        engineInput = new BufferedWriter(new OutputStreamWriter(engineProcess.getOutputStream()));
        engineOutput = new BufferedReader(new InputStreamReader(engineProcess.getInputStream()));

        sendCommand("uci");
        waitForUci();

        sendCommand("setoption name Threads value 1");
        sendCommand("setoption name Hash value 16");
        sendCommand("isready");
        waitForReady();
    }

    public synchronized void stop() {
        if (engineProcess != null) {
            try {
                sendCommand("quit");
                engineProcess.waitFor();
            } catch (Exception e) {
                try {
                    engineProcess.destroyForcibly();
                } catch (Exception ignored) {
                }
            }
            engineProcess = null;
            engineInput = null;
            engineOutput = null;
        }
    }

    public synchronized boolean isRunning() {
        return engineProcess != null && engineProcess.isAlive();
    }

    private void sendCommand(String command) throws IOException {
        if (!isRunning()) {
            start();
        }
        engineInput.write(command);
        engineInput.newLine();
        engineInput.flush();
    }

    private void waitForUci() throws IOException {
        String line;
        while ((line = engineOutput.readLine()) != null) {
            if (line.equals("uciok")) {
                return;
            }
        }
    }

    private void waitForReady() throws IOException {
        String line;
        while ((line = engineOutput.readLine()) != null) {
            if (line.equals("readyok")) {
                return;
            }
        }
    }

    public synchronized AnalysisResult analyzePosition(String fen, int depth) throws IOException {
        if (!isRunning()) {
            start();
        }

        sendCommand("position fen " + fen);
        sendCommand("go depth " + depth);

        return parseAnalysisOutput();
    }

    private AnalysisResult parseAnalysisOutput() throws IOException {
        AnalysisResult result = new AnalysisResult();
        String line;

        while ((line = engineOutput.readLine()) != null) {
            if (line.startsWith("info")) {
                parseInfo(line, result);
            }
            if (line.startsWith("bestmove")) {
                parseBestMove(line, result);
                break;
            }
        }

        return result;
    }

    private void parseInfo(String line, AnalysisResult result) {
        // Example: info depth 20 seldepth 28 multipv 1 score cp 45 nodes 125432 nps 412000 time 305 pv e2e4 c7c5
        Pattern scorePattern = Pattern.compile("score (cp|mate) (-?\\d+)");
        Pattern depthPattern = Pattern.compile("depth (\\d+)");
        Pattern pvPattern = Pattern.compile("pv (.+)$");

        Matcher depthMatcher = depthPattern.matcher(line);
        if (depthMatcher.find()) {
            result.setDepthUsed(Integer.parseInt(depthMatcher.group(1)));
        }

        Matcher scoreMatcher = scorePattern.matcher(line);
        if (scoreMatcher.find()) {
            String scoreType = scoreMatcher.group(1);
            int scoreValue = Integer.parseInt(scoreMatcher.group(2));

            if ("cp".equals(scoreType)) {
                result.setEvaluation(scoreValue / 100.0);
            } else if ("mate".equals(scoreType)) {
                result.setEvaluation(scoreValue > 0 ? 10.0 : -10.0);
            }
        }

        Matcher pvMatcher = pvPattern.matcher(line);
        if (pvMatcher.find()) {
            String pv = pvMatcher.group(1);
            String[] moves = pv.split(" ");
            if (moves.length > 0) {
                result.setBestMove(moves[0]);
            }
        }
    }

    private void parseBestMove(String line, AnalysisResult result) {
        // Example: bestmove e2e4 ponder e7e5
        String[] parts = line.split(" ");
        if (parts.length >= 2) {
            result.setBestMove(parts[1]);
        }
    }

    public synchronized void shutdown() {
        try {
            stop();
        } catch (Exception e) {
            // Ignore errors during shutdown
        }
    }
}
