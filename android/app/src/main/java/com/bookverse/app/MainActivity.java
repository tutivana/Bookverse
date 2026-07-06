package com.bookverse.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity implements BookAdapter.OnBookClickListener {

    private TextView txtWelcome;
    private TextView txtUserRole;
    private RecyclerView recyclerViewBooks;
    private MaterialButton btnAdminPanel;
    private MaterialButton btnSupport;
    private MaterialButton btnLogout;
    private List<Book> bookList;
    private BookAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Fetch User Session details
        SharedPreferences sharedPref = getSharedPreferences("BookVersePrefs", Context.MODE_PRIVATE);
        String userId = sharedPref.getString("user_id", "");
        String userName = sharedPref.getString("user_name", "Leitor");
        String userEmail = sharedPref.getString("user_email", "");
        String userRole = sharedPref.getString("user_role", "Leitor");
        String userPlan = sharedPref.getString("user_plan", "FREE");

        if (userId.isEmpty()) {
            startActivity(new Intent(MainActivity.this, LoginActivity.class));
            finish();
            return;
        }

        // Bind UI Components
        txtWelcome = findViewById(R.id.txtWelcome);
        txtUserRole = findViewById(R.id.txtUserRole);
        recyclerViewBooks = findViewById(R.id.recyclerViewBooks);
        btnAdminPanel = findViewById(R.id.btnAdminPanel);
        btnSupport = findViewById(R.id.btnSupport);
        btnLogout = findViewById(R.id.btnLogout);

        // Fill dynamic welcome texts
        txtWelcome.setText("Olá, " + userName + "!");
        txtUserRole.setText("Perfil: " + userRole + " (" + userPlan + ")");

        // Strict Administration Panel Visibility Check
        boolean isAdmin = "Super Administrador".equalsIgnoreCase(userRole) || "Administrador".equalsIgnoreCase(userRole);
        if (isAdmin) {
            btnAdminPanel.setVisibility(View.VISIBLE);
        } else {
            btnAdminPanel.setVisibility(View.GONE); // Locked completely out of sight for non-admins!
        }

        // Initialize Book Data Catalog
        initBookCatalog();

        // Setup RecyclerView
        recyclerViewBooks.setLayoutManager(new GridLayoutManager(this, 2));
        adapter = new BookAdapter(this, bookList, this);
        recyclerViewBooks.setAdapter(adapter);

        // Bind button actions
        btnAdminPanel.setOnClickListener(v -> {
            if (isAdmin) {
                startActivity(new Intent(MainActivity.this, AdminPanelActivity.class));
            } else {
                Toast.makeText(this, "Acesso restrito.", Toast.LENGTH_SHORT).show();
            }
        });

        btnSupport.setOnClickListener(v -> {
            startActivity(new Intent(MainActivity.this, SupportTicketActivity.class));
        });

        btnLogout.setOnClickListener(v -> {
            SharedPreferences.Editor editor = sharedPref.edit();
            editor.clear();
            editor.apply();
            Toast.makeText(this, "Sessão encerrada.", Toast.LENGTH_SHORT).show();
            startActivity(new Intent(MainActivity.this, LoginActivity.class));
            finish();
        });
    }

    private void initBookCatalog() {
        bookList = new ArrayList<>();
        bookList.add(new Book("dom-casmurro", "Dom Casmurro", "Machado de Assis", "", "Uma obra-prima da literatura brasileira que questiona a fidedignidade da narrativa sobre a traição.", false, true, "Active"));
        bookList.add(new Book("memorias-postumas", "Memórias Póstumas de Brás Cubas", "Machado de Assis", "", "O defunto autor conta sua vida repleta de ironias e reflexões cínicas sobre a sociedade.", true, true, "Active"));
        bookList.add(new Book("o-cortico", "O Cortiço", "Aluísio Azevedo", "", "O retrato naturalista da habitação coletiva e a degradação humana sob influências sociais.", false, false, "Active"));
        bookList.add(new Book("iracema", "Iracema", "José de Alencar", "", "A lenda da virgem dos lábios de mel e a formação mítica da identidade do povo cearense.", true, false, "Active"));
    }

    @Override
    public void onBookClick(Book book) {
        // Start reading activity
        Intent intent = new Intent(this, ReaderActivity.class);
        intent.putExtra("book_id", book.getId());
        intent.putExtra("book_title", book.getTitle());
        startActivity(intent);
    }

    @Override
    public void onAudiobookClick(Book book) {
        if (!book.hasAudiobook()) {
            Toast.makeText(this, "Este livro não possui versão em Audiobook.", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // Start audiobook player activity
        Intent intent = new Intent(this, AudiobookActivity.class);
        intent.putExtra("book_id", book.getId());
        intent.putExtra("book_title", book.getTitle());
        startActivity(intent);
    }
}
