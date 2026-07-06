package com.bookverse.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;

public class ReaderActivity extends AppCompatActivity {

    private TextView txtTitle;
    private TextView txtBookContent;
    private MaterialButton btnFontDecrease;
    private MaterialButton btnFontIncrease;
    private MaterialButton btnBookmark;
    private MaterialButton btnBack;
    
    private float currentFontSize = 14f; // SP
    private boolean isBookmarked = false;
    private String bookId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_reader);

        // Bind Views
        txtTitle = findViewById(R.id.txtTitle);
        txtBookContent = findViewById(R.id.txtBookContent);
        btnFontDecrease = findViewById(R.id.btnFontDecrease);
        btnFontIncrease = findViewById(R.id.btnFontIncrease);
        btnBookmark = findViewById(R.id.btnBookmark);
        btnBack = findViewById(R.id.btnBack);

        // Get extras
        bookId = getIntent().getStringExtra("book_id");
        String bookTitle = getIntent().getStringExtra("book_title");

        txtTitle.setText(bookTitle != null ? bookTitle : "Leitor BookVerse");

        // Load mock book text
        txtBookContent.setText(getMockBookText());

        // Buttons listeners
        btnBack.setOnClickListener(v -> finish());

        btnFontIncrease.setOnClickListener(v -> {
            if (currentFontSize < 28) {
                currentFontSize += 2;
                txtBookContent.setTextSize(TypedValue.COMPLEX_UNIT_SP, currentFontSize);
            }
        });

        btnFontDecrease.setOnClickListener(v -> {
            if (currentFontSize > 10) {
                currentFontSize -= 2;
                txtBookContent.setTextSize(TypedValue.COMPLEX_UNIT_SP, currentFontSize);
            }
        });

        btnBookmark.setOnClickListener(v -> {
            isBookmarked = !isBookmarked;
            if (isBookmarked) {
                btnBookmark.setIconTintResource(R.color.gold_amber);
                Toast.makeText(this, "Marcador adicionado nesta página!", Toast.LENGTH_SHORT).show();
            } else {
                btnBookmark.setIconTintResource(R.color.zinc_400);
                Toast.makeText(this, "Marcador removido.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private String getMockBookText() {
        return "Capítulo 1: Uma Noite de Inverno\n\n" +
                "Era uma noite tempestuosa e fria. As folhas das árvores do jardim batiam contra os vidros da janela como se implorassem por abrigo. Sentado diante da lareira, ele observava o fogo consumir lentamente a lenha, projetando sombras alongadas e fantasmagóricas pelas paredes do velho casarão histórico.\n\n" +
                "Ele segurava em mãos a carta recém-recebida, cuja caligrafia apressada e trêmula sugeria urgência. Quem seria o remetente misterioso que assinara apenas com a letra 'C'? Os mistérios que cercavam aquela revelação estavam apenas começando a se desvendar na calada da noite.\n\n" +
                "Capítulo 2: O Segredo de Capitu\n\n" +
                "Os olhos de ressaca, oblíquos e dissimulados, desafiavam qualquer tentativa de decifração. Havia ali uma força que atraía e assustava simultaneamente. Se havia culpa ou inocência, o tempo e as águas do esquecimento se encarregariam de sepultar a verdade.\n\n" +
                "As memórias flutuavam no ar denso da biblioteca, onde o cheiro de papel antigo e couro curtido acalmava sua alma inquieta. Cada livro naquela estante guardava mais do que palavras; continha segredos eternos de vidas passadas.";
    }
}
