import logging
from app.config import settings

logger = logging.getLogger(__name__)

_llm_instance = None


def get_llm():
    global _llm_instance
    if _llm_instance is not None:
        return _llm_instance

    provider = settings.LLM_PROVIDER.lower()
    logger.info(f"[LLM] Initialising provider: '{provider}'")

    if provider == "openai":
        from langchain_openai import ChatOpenAI
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set in .env")
        _llm_instance = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            openai_api_key=settings.OPENAI_API_KEY,
            temperature=0.0,   # deterministic — no hallucination
            max_tokens=1024,
        )

    elif provider == "ollama":
        try:
            from langchain_ollama import OllamaLLM
        except ImportError:
            from langchain_community.llms import Ollama as OllamaLLM
        logger.info(f"[LLM] Ollama: {settings.OLLAMA_BASE_URL} / {settings.OLLAMA_MODEL}")
        _llm_instance = OllamaLLM(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            temperature=0.0,   # deterministic — no hallucination
            num_ctx=4096,
            num_predict=1024,
        )

    elif provider == "huggingface":
        try:
            from langchain_community.llms import HuggingFacePipeline
            from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
            import torch
        except ImportError:
            raise ImportError("Run: pip install transformers accelerate torch")
        tokenizer = AutoTokenizer.from_pretrained(settings.HF_MODEL_ID)
        model = AutoModelForCausalLM.from_pretrained(
            settings.HF_MODEL_ID,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto",
        )
        pipe = pipeline(
            "text-generation", model=model, tokenizer=tokenizer,
            max_new_tokens=512, temperature=0.0,
        )
        _llm_instance = HuggingFacePipeline(pipeline=pipe)

    else:
        raise ValueError(f"Unknown LLM_PROVIDER: '{provider}'")

    logger.info("[LLM] Ready.")
    return _llm_instance
