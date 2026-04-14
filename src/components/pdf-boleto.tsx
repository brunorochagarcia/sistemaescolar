'use client'

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: { marginBottom: 24 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#6b7280' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 8, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#6b7280' },
  value: { fontFamily: 'Helvetica-Bold' },
  divider: { borderBottom: '1 solid #e5e7eb', marginBottom: 16, marginTop: 8 },
  codigoBox: { backgroundColor: '#f9fafb', border: '1 solid #e5e7eb', borderRadius: 4, padding: 10, marginBottom: 16 },
  codigoText: { fontFamily: 'Courier', fontSize: 9, letterSpacing: 1 },
  footer: { marginTop: 32, color: '#9ca3af', fontSize: 8, textAlign: 'center' },
})

interface BoletoData {
  id: string
  alunoNome: string
  numeroCadastro: string | null
  cursoNome: string
  valor: number
  mesReferencia: string
  dataVencimento: string
  status: string
  codigoBarras: string
  linhaDigitavel: string
}

function BoletoDocument({ boleto }: { boleto: BoletoData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>EscolaFull</Text>
          <Text style={styles.subtitle}>Boleto de Mensalidade — {boleto.mesReferencia}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Aluno</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.value}>{boleto.alunoNome}</Text>
          </View>
          {boleto.numeroCadastro && (
            <View style={styles.row}>
              <Text style={styles.label}>Nº Cadastro</Text>
              <Text style={styles.value}>{boleto.numeroCadastro}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Curso</Text>
            <Text style={styles.value}>{boleto.cursoNome}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Boleto</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Valor</Text>
            <Text style={styles.value}>R$ {boleto.valor.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Vencimento</Text>
            <Text style={styles.value}>{boleto.dataVencimento}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{boleto.status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.codigoBox}>
          <Text style={styles.sectionTitle}>Linha Digitável</Text>
          <Text style={styles.codigoText}>{boleto.linhaDigitavel}</Text>
        </View>

        <View style={styles.codigoBox}>
          <Text style={styles.sectionTitle}>Código de Barras</Text>
          <Text style={styles.codigoText}>{boleto.codigoBarras}</Text>
        </View>

        <Text style={styles.footer}>
          Boleto simulado — gerado por EscolaFull · ID {boleto.id}
        </Text>
      </Page>
    </Document>
  )
}

interface PdfBoletoProps {
  boleto: BoletoData
}

export function PdfBoleto({ boleto }: PdfBoletoProps) {
  return (
    <PDFDownloadLink
      document={<BoletoDocument boleto={boleto} />}
      fileName={`boleto-${boleto.alunoNome.replace(/\s+/g, '-').toLowerCase()}-${boleto.mesReferencia}.pdf`}
      className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
    >
      {({ loading }) => (loading ? 'Gerando PDF...' : 'Baixar PDF')}
    </PDFDownloadLink>
  )
}
