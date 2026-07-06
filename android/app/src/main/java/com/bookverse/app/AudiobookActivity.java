package com.bookverse.app;

import android.os.Bundle;
import android.os.Handler;
import android.view.View;
import android.widget.ImageView;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;

public class AudiobookActivity extends AppCompatActivity {

    private TextView txtTitle;
    private TextView txtAuthor;
    private TextView txtCurrentTime;
    private TextView txtTotalTime;
    private SeekBar seekBarProgress;
    private MaterialButton btnPlayPause;
    private MaterialButton btnForward;
    private MaterialButton btnRewind;
    private MaterialButton btnSpeed;
    private MaterialButton btnBack;

    private boolean isPlaying = false;
    private double currentSpeed = 1.0;
    private int currentPositionSeconds = 0;
    private final int totalDurationSeconds = 1845; // 30 mins 45 secs

    private Handler handler = new Handler();
    private Runnable updateTimeTask;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_audiobook);

        // Bind UI Elements
        txtTitle = findViewById(R.id.txtTitle);
        txtAuthor = findViewById(R.id.txtAuthor);
        txtCurrentTime = findViewById(R.id.txtCurrentTime);
        txtTotalTime = findViewById(R.id.txtTotalTime);
        seekBarProgress = findViewById(R.id.seekBarProgress);
        btnPlayPause = findViewById(R.id.btnPlayPause);
        btnForward = findViewById(R.id.btnForward);
        btnRewind = findViewById(R.id.btnRewind);
        btnSpeed = findViewById(R.id.btnSpeed);
        btnBack = findViewById(R.id.btnBack);

        // Populate details
        String bookTitle = getIntent().getStringExtra("book_title");
        txtTitle.setText(bookTitle != null ? bookTitle : "Audiobook Player");
        txtAuthor.setText("Narrador Profissional - AI Synthesized");

        // Set limits
        seekBarProgress.setMax(totalDurationSeconds);
        txtTotalTime.setText(formatTime(totalDurationSeconds));
        txtCurrentTime.setText(formatTime(0));

        // Buttons
        btnBack.setOnClickListener(v -> finish());

        btnPlayPause.setOnClickListener(v -> {
            isPlaying = !isPlaying;
            if (isPlaying) {
                btnPlayPause.setIconResource(android.R.drawable.ic_media_pause);
                startPlaybackTimer();
                Toast.makeText(this, "Reproduzindo Audiobook...", Toast.LENGTH_SHORT).show();
            } else {
                btnPlayPause.setIconResource(android.R.drawable.ic_media_play);
                stopPlaybackTimer();
                Toast.makeText(this, "Audiobook pausado.", Toast.LENGTH_SHORT).show();
            }
        });

        btnForward.setOnClickListener(v -> {
            currentPositionSeconds = Math.min(totalDurationSeconds, currentPositionSeconds + 15);
            seekBarProgress.setProgress(currentPositionSeconds);
            txtCurrentTime.setText(formatTime(currentPositionSeconds));
        });

        btnRewind.setOnClickListener(v -> {
            currentPositionSeconds = Math.max(0, currentPositionSeconds - 15);
            seekBarProgress.setProgress(currentPositionSeconds);
            txtCurrentTime.setText(formatTime(currentPositionSeconds));
        });

        btnSpeed.setOnClickListener(v -> {
            if (currentSpeed == 1.0) currentSpeed = 1.25;
            else if (currentSpeed == 1.25) currentSpeed = 1.5;
            else if (currentSpeed == 1.5) currentSpeed = 2.0;
            else currentSpeed = 1.0;

            btnSpeed.setText(currentSpeed + "x");
            Toast.makeText(this, "Velocidade de reprodução: " + currentSpeed + "x", Toast.LENGTH_SHORT).show();
        });

        // SeekBar change listener
        seekBarProgress.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                if (fromUser) {
                    currentPositionSeconds = progress;
                    txtCurrentTime.setText(formatTime(currentPositionSeconds));
                }
            }

            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {}

            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {}
        });
    }

    private void startPlaybackTimer() {
        updateTimeTask = new Runnable() {
            @Override
            public void run() {
                if (isPlaying && currentPositionSeconds < totalDurationSeconds) {
                    currentPositionSeconds++;
                    seekBarProgress.setProgress(currentPositionSeconds);
                    txtCurrentTime.setText(formatTime(currentPositionSeconds));
                    handler.postDelayed(this, (long) (1000 / currentSpeed));
                }
            }
        };
        handler.post(updateTimeTask);
    }

    private void stopPlaybackTimer() {
        if (updateTimeTask != null) {
            handler.removeCallbacks(updateTimeTask);
        }
    }

    private String formatTime(int totalSeconds) {
        int minutes = totalSeconds / 60;
        int seconds = totalSeconds % 60;
        return String.format("%02d:%02d", minutes, seconds);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopPlaybackTimer();
    }
}
