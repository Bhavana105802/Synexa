import os
import uuid
import logging
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_core.documents import Document


from app.config import settings

logger = logging.getLogger(__name__)


def chunk_documents(
    documents: List[Document],
    parent_chunk_size: int = 1500,
    child_chunk_size: int = 400,
    chunk_overlap: int = 100,
) -> List[Document]:
    """
    Parent-Child Hierarchical Chunking Pipeline.
    
    1. First, documents are split into parent chunks (large context blocks).
    2. Each parent chunk is given a unique parent_id.
    3. Parent chunks are further split into child chunks (high-precision search vectors).
    4. Each child chunk retains metadata linking to its parent_id and parent_text.
    """
    parent_splitter = RecursiveCharacterTextSplitter(
        chunk_size=parent_chunk_size,
        chunk_overlap=chunk_overlap * 2,
        separators=["\n\n", "\n# ", "\n## ", "\n", ". ", " "],
        strip_whitespace=True,
    )

    child_splitter = RecursiveCharacterTextSplitter(
        chunk_size=child_chunk_size or settings.CHUNK_SIZE,
        chunk_overlap=chunk_overlap or settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""],
        strip_whitespace=True,
    )

    final_chunks: List[Document] = []
    chunk_counter = 0

    for doc_idx, doc in enumerate(documents):
        parent_docs = parent_splitter.split_documents([doc])
        
        for parent_idx, parent in enumerate(parent_docs):
            parent_id = f"parent_{doc_idx}_{parent_idx}_{uuid.uuid4().hex[:6]}"
            parent_text = parent.page_content.strip()
            
            if not parent_text:
                continue

            child_docs = child_splitter.split_documents([parent])
            for child in child_docs:
                content = child.page_content.strip()
                if not content:
                    continue

                chunk_counter += 1
                child.metadata["chunk_id"] = f"chunk_{chunk_counter}"
                child.metadata["parent_id"] = parent_id
                child.metadata["parent_text"] = parent_text
                
                if "document_name" not in child.metadata:
                    raw_source = child.metadata.get("source", "unknown")
                    child.metadata["document_name"] = os.path.basename(raw_source)

                child.metadata.setdefault("file_type", "unknown")
                final_chunks.append(child)

    logger.info(
        f"[Chunking] {len(documents)} raw doc(s) → {len(final_chunks)} child chunks "
        f"(Parent-Child Hierarchical Splitter: parent={parent_chunk_size}, child={child_chunk_size})"
    )

    return final_chunks