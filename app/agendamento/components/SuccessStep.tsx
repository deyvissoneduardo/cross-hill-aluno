"use client";

import { useEffect, useState } from "react";

import { InlineBanner } from "@/components/ui/InlineBanner";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { configuracaoRepository } from "../repositories/configuracaoRepository";
import type { ConfiguracaoSucesso } from "../types";

const FALLBACK_SUCESSO: ConfiguracaoSucesso = {
  titulo: "Agendamento solicitado!",
  descricao: "Seu horário está aguardando confirmação administrativa.",
  regras: [],
  dicas: [],
  avisos: [],
};

type LoadState = "loading" | "ready";

export function SuccessStep() {
  const [status, setStatus] = useState<LoadState>("loading");
  const [configuracao, setConfiguracao] =
    useState<ConfiguracaoSucesso>(FALLBACK_SUCESSO);

  useEffect(() => {
    let ativo = true;

    configuracaoRepository.buscarSucesso().then((resultado) => {
      if (!ativo) return;

      if (resultado.ok) {
        setConfiguracao(normalizarConfiguracao(resultado.dados));
      } else {
        setConfiguracao(FALLBACK_SUCESSO);
      }
      setStatus("ready");
    });

    return () => {
      ativo = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <div
        className="flex flex-col gap-4"
        aria-label="Carregando confirmação da solicitação"
      >
        <SkeletonBlock height="2rem" label="Carregando título de sucesso" />
        <SkeletonBlock height="3rem" label="Carregando descrição de sucesso" />
        <SkeletonBlock height="5rem" label="Carregando orientações" />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="success-heading">
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[var(--success)]/40 bg-[var(--success)]/10 text-xl font-semibold text-[var(--success)]"
        >
          ✓
        </div>

        <div className="flex flex-col gap-2">
          <h1
            id="success-heading"
            className="text-2xl font-semibold text-[var(--foreground)]"
          >
            {configuracao.titulo}
          </h1>

          <p className="text-sm leading-6 text-[var(--text-muted)]">
            {configuracao.descricao}
          </p>
        </div>
      </div>

      {renderSecao("Regras", configuracao.regras)}
      {renderSecao("Dicas", configuracao.dicas)}
      {renderSecao("Avisos importantes", configuracao.avisos, "warning")}
    </section>
  );
}

function normalizarConfiguracao(
  configuracao: ConfiguracaoSucesso,
): ConfiguracaoSucesso {
  const titulo = configuracao.titulo.trim() || FALLBACK_SUCESSO.titulo;
  const descricao = configuracao.descricao.trim() || FALLBACK_SUCESSO.descricao;

  return {
    titulo,
    descricao,
    regras: filtrarTextos(configuracao.regras),
    dicas: filtrarTextos(configuracao.dicas),
    avisos: filtrarTextos(configuracao.avisos),
  };
}

function filtrarTextos(itens: string[]): string[] {
  return itens.map((item) => item.trim()).filter(Boolean);
}

function renderSecao(
  titulo: string,
  itens: string[],
  tone: "info" | "warning" = "info",
) {
  if (itens.length === 0) return null;

  return (
    <InlineBanner tone={tone} title={titulo}>
      <ul className="list-disc space-y-1 pl-5">
        {itens.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </InlineBanner>
  );
}
