package com.bookverse.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;

public class SupportTicketActivity extends AppCompatActivity {

    private EditText editSupportMessage;
    private MaterialButton btnSendSupport;
    private MaterialButton btnBack;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_support_ticket);

        // Bind Views
        editSupportMessage = findViewById(R.id.editSupportMessage);
        btnSendSupport = findViewById(R.id.btnSendSupport);
        btnBack = findViewById(R.id.btnBack);

        btnBack.setOnClickListener(v -> finish());

        btnSendSupport.setOnClickListener(v -> {
            String message = editSupportMessage.getText().toString().trim();
            if (message.isEmpty()) {
                Toast.makeText(this, "Por favor, descreva sua dúvida ou feedback.", Toast.LENGTH_SHORT).show();
                return;
            }

            // Simulate Firestore notification insertion
            SharedPreferences sharedPref = getSharedPreferences("BookVersePrefs", Context.MODE_PRIVATE);
            String userEmail = sharedPref.getString("user_email", "leitor@bookverse.com");

            Toast.makeText(this, "Feedback enviado com sucesso! Os administradores analisarão seu chamado.", Toast.LENGTH_LONG).show();
            editSupportMessage.setText("");
            finish();
        });
    }
}
