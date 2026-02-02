import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Cpu, MousePointer2, BarChart3, Brain, CheckCircle, XCircle, Clock, FileSpreadsheet, FileJson, Database, Download } from 'lucide-react';

function App() {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState({
    tesseract: null,
    donut: null,
    llama: null
  });
  const [loading, setLoading] = useState({
    tesseract: false,
    donut: false,
    llama: false
  });
  const [activeMethod, setActiveMethod] = useState(null);
  const [exportFormat, setExportFormat] = useState(null);
  const [selectedMethodForExport, setSelectedMethodForExport] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    // Reset wyników przy nowym pliku
    setResults({ tesseract: null, donut: null, llama: null });
  };

  const uploadInvoice = async (modelType) => {
    if (!file) return alert("Najpierw wybierz plik!");

    setLoading(prev => ({ ...prev, [modelType]: true }));
    setActiveMethod(modelType);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`http://127.0.0.1:8000/upload/${modelType}`, formData);
      setResults(prev => ({ ...prev, [modelType]: response.data }));
    } catch (error) {
      console.error("Błąd przesyłania:", error);
      setResults(prev => ({
        ...prev,
        [modelType]: { error: true, message: "Błąd połączenia z backendem!" }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [modelType]: false }));
    }
  };

  const runAllMethods = async () => {
    if (!file) return alert("Najpierw wybierz plik!");
    await Promise.all([
      uploadInvoice('tesseract'),
      uploadInvoice('donut'),
      uploadInvoice('llama')
    ]);
  };

  const getResultCount = () => {
    return Object.values(results).filter(r => r !== null && !r.error).length;
  };

  // Funkcja do generowania i pobierania eksportu
  const handleExport = async (format) => {
    const methodToExport = selectedMethodForExport || Object.keys(results).find(k => results[k] && !results[k].error);

    if (!methodToExport || !results[methodToExport]) {
      alert("Najpierw wykonaj ekstrakcję danych!");
      return;
    }

    const data = results[methodToExport].results;

    if (format === 'json') {
      // Eksport JSON
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      downloadFile(blob, 'faktura_export.json');
    }
    else if (format === 'xlsx') {
      // Eksport XLSX - wywołanie backendu
      try {
        const response = await axios.post('http://127.0.0.1:8000/export/xlsx', data, {
          responseType: 'blob'
        });
        downloadFile(response.data, 'faktura_export.xlsx');
      } catch (error) {
        alert("Błąd eksportu XLSX: " + error.message);
      }
    }
    else if (format === 'sql') {
      // Generowanie SQL
      const sql = generateSQL(data);
      const blob = new Blob([sql], { type: 'text/plain' });
      downloadFile(blob, 'faktura_export.sql');
    }
  };

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const generateSQL = (data) => {
    const sql = `-- Tabela faktur - wygenerowano automatycznie
-- Data generacji: ${new Date().toISOString()}

CREATE TABLE IF NOT EXISTS faktury (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sprzedawca_nazwa VARCHAR(255),
    sprzedawca_nip VARCHAR(20),
    nabywca_nazwa VARCHAR(255),
    nabywca_nip VARCHAR(20),
    numer_faktury VARCHAR(50),
    data_wystawienia DATE,
    data_wykonania_uslugi DATE,
    kwota_brutto DECIMAL(12,2),
    termin_platnosci DATE,
    sposob_platnosci VARCHAR(50),
    bank VARCHAR(100),
    nr_konta VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO faktury (
    sprzedawca_nazwa,
    sprzedawca_nip,
    nabywca_nazwa,
    nabywca_nip,
    numer_faktury,
    data_wystawienia,
    data_wykonania_uslugi,
    kwota_brutto,
    termin_platnosci,
    sposob_platnosci,
    bank,
    nr_konta
) VALUES (
    '${data.sprzedawca?.nazwa || ''}',
    '${data.sprzedawca?.nip || ''}',
    '${data.nabywca?.nazwa || ''}',
    '${data.nabywca?.nip || ''}',
    '${data.faktura?.numer || ''}',
    ${data.faktura?.data_wystawienia ? `STR_TO_DATE('${data.faktura.data_wystawienia}', '%d.%m.%Y')` : 'NULL'},
    ${data.faktura?.data_wykonania_uslugi ? `STR_TO_DATE('${data.faktura.data_wykonania_uslugi}', '%d.%m.%Y')` : 'NULL'},
    ${parseFloat(String(data.platnosc?.kwota_brutto || '0').replace(/\s/g, '').replace(',', '.')) || 'NULL'},
    ${data.platnosc?.termin_platnosci ? `STR_TO_DATE('${data.platnosc.termin_platnosci}', '%d.%m.%Y')` : 'NULL'},
    '${data.platnosc?.sposob_platnosci || ''}',
    '${data.platnosc?.bank || ''}',
    '${data.platnosc?.nr_konta || ''}'
);
`;
    return sql;
  };

  const getAvailableMethods = () => {
    return Object.keys(results).filter(k => results[k] && !results[k].error);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>SYSTEM DO EKSTRAKCJI I ANALIZY FAKTUR</h1>
        <p>Praca Magisterska: Eryk Borycki</p>
      </header>

      <main style={styles.main}>
        {/* SEKCJA WGRYWANIA */}
        <div style={styles.uploadBox}>
          <label style={styles.uploadLabel}>
            <Upload size={40} />
            <span>Wgraj plik PDF faktury</span>
            <input type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
          {file && <p>Wybrano: <strong>{file.name}</strong></p>}
        </div>

        {/* WYBÓR METODY EKSTRAKCJI - 3 PRZYCISKI */}
        <div style={styles.methodsSection}>
          <h3 style={styles.sectionTitle}>Wybierz metodę ekstrakcji:</h3>
          <div style={styles.modeContainer}>
            <button
              onClick={() => uploadInvoice('tesseract')}
              style={{
                ...styles.methodBtn,
                ...styles.tesseractBtn,
                opacity: loading.tesseract ? 0.7 : 1
              }}
              disabled={loading.tesseract}
            >
              <MousePointer2 size={24} />
              <span style={styles.btnTitle}>TESSERACT</span>
              <span style={styles.btnSubtitle}>OCR + Regex</span>
              {loading.tesseract && <span style={styles.loadingDot}>...</span>}
            </button>

            <button
              onClick={() => uploadInvoice('donut')}
              style={{
                ...styles.methodBtn,
                ...styles.donutBtn,
                opacity: loading.donut ? 0.7 : 1
              }}
              disabled={loading.donut}
            >
              <Cpu size={24} />
              <span style={styles.btnTitle}>DONUT</span>
              <span style={styles.btnSubtitle}>Transformer AI</span>
              {loading.donut && <span style={styles.loadingDot}>...</span>}
            </button>

            <button
              onClick={() => uploadInvoice('llama')}
              style={{
                ...styles.methodBtn,
                ...styles.llamaBtn,
                opacity: loading.llama ? 0.7 : 1
              }}
              disabled={loading.llama}
            >
              <Brain size={24} />
              <span style={styles.btnTitle}>LLAMA</span>
              <span style={styles.btnSubtitle}>OCR + LLM</span>
              {loading.llama && <span style={styles.loadingDot}>...</span>}
            </button>
          </div>

          <button onClick={runAllMethods} style={styles.runAllBtn}>
            <BarChart3 size={20} />
            Uruchom wszystkie metody i porównaj
          </button>
        </div>

        {/* SEKCJA WALIDACJI WYNIKÓW */}
        {getResultCount() > 0 && (
          <div style={styles.validationSection}>
            <h3 style={styles.sectionTitle}>
              <CheckCircle size={20} style={{ marginRight: '8px' }} />
              Walidacja wyników ekstrakcji
            </h3>

            <div style={styles.resultsGrid}>
              {/* Wynik Tesseract */}
              {results.tesseract && (
                <div style={{
                  ...styles.resultCard,
                  borderColor: results.tesseract.error ? '#e74c3c' : '#3498db'
                }}>
                  <div style={styles.resultHeader}>
                    <MousePointer2 size={18} />
                    <span>TESSERACT</span>
                    {results.tesseract.error ? (
                      <XCircle size={18} style={{ color: '#e74c3c' }} />
                    ) : (
                      <CheckCircle size={18} style={{ color: '#27ae60' }} />
                    )}
                  </div>
                  {results.tesseract.error ? (
                    <p style={styles.errorText}>{results.tesseract.message}</p>
                  ) : (
                    <>
                      <pre style={styles.jsonViewSmall}>
                        {JSON.stringify(results.tesseract.results, null, 2)}
                      </pre>
                      <div style={styles.timeInfo}>
                        <Clock size={14} />
                        <span>{results.tesseract.execution_time}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Wynik DONUT */}
              {results.donut && (
                <div style={{
                  ...styles.resultCard,
                  borderColor: results.donut.error ? '#e74c3c' : '#9b59b6'
                }}>
                  <div style={styles.resultHeader}>
                    <Cpu size={18} />
                    <span>DONUT</span>
                    {results.donut.error ? (
                      <XCircle size={18} style={{ color: '#e74c3c' }} />
                    ) : (
                      <CheckCircle size={18} style={{ color: '#27ae60' }} />
                    )}
                  </div>
                  {results.donut.error ? (
                    <p style={styles.errorText}>{results.donut.message}</p>
                  ) : (
                    <>
                      <pre style={styles.jsonViewSmall}>
                        {JSON.stringify(results.donut.results, null, 2)}
                      </pre>
                      <div style={styles.timeInfo}>
                        <Clock size={14} />
                        <span>{results.donut.execution_time}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Wynik LLAMA */}
              {results.llama && (
                <div style={{
                  ...styles.resultCard,
                  borderColor: results.llama.error ? '#e74c3c' : '#e67e22'
                }}>
                  <div style={styles.resultHeader}>
                    <Brain size={18} />
                    <span>LLAMA</span>
                    {results.llama.error ? (
                      <XCircle size={18} style={{ color: '#e74c3c' }} />
                    ) : (
                      <CheckCircle size={18} style={{ color: '#27ae60' }} />
                    )}
                  </div>
                  {results.llama.error ? (
                    <p style={styles.errorText}>{results.llama.message}</p>
                  ) : (
                    <>
                      <pre style={styles.jsonViewSmall}>
                        {JSON.stringify(results.llama.results, null, 2)}
                      </pre>
                      <div style={styles.timeInfo}>
                        <Clock size={14} />
                        <span>{results.llama.execution_time}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Podsumowanie porównania */}
            {getResultCount() >= 2 && (
              <div style={styles.comparisonSummary}>
                <h4>Podsumowanie porównania:</h4>
                <p>Przeanalizowano {getResultCount()} metod(y) ekstrakcji.</p>
                {!Object.values(loading).some(l => l) && (
                  <p style={styles.benefit}>
                    Wszystkie metody zakończyły przetwarzanie. Porównaj wyniki powyżej.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status ładowania */}
        {Object.values(loading).some(l => l) && (
          <div style={styles.loadingStatus}>
            <p>Przetwarzanie danych przez AI...</p>
            <div style={styles.loadingMethods}>
              {loading.tesseract && <span>Tesseract...</span>}
              {loading.donut && <span>DONUT...</span>}
              {loading.llama && <span>LLaMA...</span>}
            </div>
          </div>
        )}

        {/* SEKCJA EKSPORTU DANYCH */}
        {getResultCount() > 0 && (
          <div style={styles.exportSection}>
            <h3 style={styles.sectionTitle}>
              <Download size={20} style={{ marginRight: '8px' }} />
              Eksport danych
            </h3>

            {/* Wybór metody do eksportu (jeśli jest więcej niż jedna) */}
            {getAvailableMethods().length > 1 && (
              <div style={styles.methodSelector}>
                <label style={styles.selectorLabel}>Wybierz źródło danych do eksportu:</label>
                <div style={styles.methodSelectorBtns}>
                  {getAvailableMethods().map(method => (
                    <button
                      key={method}
                      onClick={() => setSelectedMethodForExport(method)}
                      style={{
                        ...styles.methodSelectorBtn,
                        backgroundColor: selectedMethodForExport === method ? '#1a2a6c' : '#e0e0e0',
                        color: selectedMethodForExport === method ? '#fff' : '#333'
                      }}
                    >
                      {method.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p style={styles.exportInfo}>
              Wybierz format eksportu wyekstrahowanych danych:
            </p>

            <div style={styles.exportBtnsContainer}>
              {/* XLSX */}
              <button
                onClick={() => handleExport('xlsx')}
                style={{...styles.exportBtn, ...styles.xlsxBtn}}
              >
                <FileSpreadsheet size={28} />
                <span style={styles.exportBtnTitle}>XLSX</span>
                <span style={styles.exportBtnDesc}>Arkusz Excel z kolumnami</span>
              </button>

              {/* JSON */}
              <button
                onClick={() => handleExport('json')}
                style={{...styles.exportBtn, ...styles.jsonBtn}}
              >
                <FileJson size={28} />
                <span style={styles.exportBtnTitle}>JSON</span>
                <span style={styles.exportBtnDesc}>Format JSON strukturalny</span>
              </button>

              {/* SQL */}
              <button
                onClick={() => handleExport('sql')}
                style={{...styles.exportBtn, ...styles.sqlBtn}}
              >
                <Database size={28} />
                <span style={styles.exportBtnTitle}>SQL</span>
                <span style={styles.exportBtnDesc}>CREATE + INSERT statement</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '20px' },
  header: { textAlign: 'center', borderBottom: '2px solid #1a2a6c', marginBottom: '40px', paddingBottom: '20px' },
  title: { fontSize: '24px', fontWeight: 'bold', color: '#1a2a6c', marginBottom: '5px' },
  main: { maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' },
  uploadBox: { border: '3px dashed #1a2a6c', borderRadius: '15px', padding: '40px', textAlign: 'center', backgroundColor: '#fff' },
  uploadLabel: { cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#1a2a6c' },

  // Sekcja metod
  methodsSection: { backgroundColor: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  sectionTitle: { marginBottom: '20px', color: '#1a2a6c', display: 'flex', alignItems: 'center' },
  modeContainer: { display: 'flex', justifyContent: 'space-between', gap: '15px', marginBottom: '20px' },

  // Przyciski metod
  methodBtn: {
    flex: 1,
    padding: '20px 15px',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  tesseractBtn: { backgroundColor: '#3498db', color: '#fff' },
  donutBtn: { backgroundColor: '#9b59b6', color: '#fff' },
  llamaBtn: { backgroundColor: '#e67e22', color: '#fff' },
  btnTitle: { fontSize: '16px', fontWeight: 'bold' },
  btnSubtitle: { fontSize: '11px', opacity: 0.9 },
  loadingDot: { fontSize: '18px' },

  runAllBtn: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#1a2a6c',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontSize: '14px'
  },

  // Sekcja walidacji
  validationSection: { backgroundColor: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  resultsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },

  resultCard: {
    border: '2px solid',
    borderRadius: '10px',
    padding: '15px',
    backgroundColor: '#fafafa'
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    fontWeight: 'bold',
    color: '#333'
  },
  jsonViewSmall: {
    backgroundColor: '#2d3436',
    color: '#dfe6e9',
    padding: '12px',
    borderRadius: '5px',
    overflowX: 'auto',
    fontSize: '12px',
    maxHeight: '200px',
    overflowY: 'auto'
  },
  timeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '10px',
    color: '#666',
    fontSize: '13px'
  },
  errorText: { color: '#e74c3c', fontStyle: 'italic' },

  // Podsumowanie
  comparisonSummary: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#e8f6f3',
    borderRadius: '8px',
    borderLeft: '4px solid #27ae60'
  },
  benefit: { color: '#27ae60', fontWeight: 'bold', marginTop: '10px' },

  // Status ładowania
  loadingStatus: { textAlign: 'center', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '10px' },
  loadingMethods: { display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', color: '#856404' },

  // Sekcja eksportu
  exportSection: {
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '15px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    borderTop: '4px solid #27ae60'
  },
  exportInfo: {
    color: '#666',
    marginBottom: '20px',
    fontSize: '14px'
  },
  exportBtnsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '15px'
  },
  exportBtn: {
    flex: 1,
    padding: '25px 15px',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    color: '#fff'
  },
  xlsxBtn: { backgroundColor: '#27ae60' },
  jsonBtn: { backgroundColor: '#f39c12' },
  sqlBtn: { backgroundColor: '#8e44ad' },
  exportBtnTitle: { fontSize: '18px', fontWeight: 'bold' },
  exportBtnDesc: { fontSize: '11px', opacity: 0.9, textAlign: 'center' },

  // Selektor metody do eksportu
  methodSelector: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  selectorLabel: {
    display: 'block',
    marginBottom: '10px',
    fontWeight: 'bold',
    color: '#333'
  },
  methodSelectorBtns: {
    display: 'flex',
    gap: '10px'
  },
  methodSelectorBtn: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  }
};

export default App;