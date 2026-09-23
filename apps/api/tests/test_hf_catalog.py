from planetai_api.hf_catalog import HfCatalog, HfItem, _fetch, hf_author, model_share_count


def test_classify_dataset():
    from planetai_api.hf_catalog import classify_dataset

    assert classify_dataset("Cybersecurity-Dataset-Fenrir-v2.1") == "guvenlik"
    assert classify_dataset("legal_nli_TR_V1") == "hukuk"
    assert classify_dataset("Turkish-Finance-SFT-Dataset") == "finans"
    assert classify_dataset("sozcu-news-2014") == "medya"
    assert classify_dataset("Cosmos-Turkish-Corpus-v1.0") == "corpus"
    assert classify_dataset("Turkish-SFT-Dataset-v1.0") == "sft"
    assert classify_dataset("deprem-tweet-dataset") == "sektorel"
    assert classify_dataset("mystery-xyz") == "genel"


def test_hf_author_from_profile_url():
    assert hf_author("https://huggingface.co/AlicanKiraz0") == "AlicanKiraz0"
    assert hf_author("https://huggingface.co/ytu-ce-cosmos/") == "ytu-ce-cosmos"
    assert hf_author("https://huggingface.co/datasets") is None
    assert hf_author(None) is None
    assert hf_author("https://github.com/alicankiraz1") is None


def test_model_share_count():
    catalog = HfCatalog(
        llm=[HfItem("a", "https://huggingface.co/x/a", "llm", 1)],
        tts=[HfItem("b", "https://huggingface.co/x/b", "tts", 2)],
        datasets=[HfItem("c", "https://huggingface.co/datasets/x/c", "dataset", 3)],
    )
    assert model_share_count(catalog) == 2


def test_fetch_splits_llm_tts_and_datasets(monkeypatch):
    def fake_list(url: str):
        if "/api/datasets" in url:
            return [
                {"id": "AlicanKiraz0/Turkish-SFT-Dataset-v1.0", "downloads": 12, "private": False},
                {"id": "AlicanKiraz0/hidden", "downloads": 99, "private": True},
            ]
        return [
            {"id": "AlicanKiraz0/Mizan", "downloads": 40, "pipeline_tag": "text-generation"},
            {"id": "AlicanKiraz0/Voice", "downloads": 8, "pipeline_tag": "text-to-speech"},
        ]

    monkeypatch.setattr("planetai_api.hf_catalog._list", fake_list)
    catalog = _fetch("AlicanKiraz0")
    assert isinstance(catalog, HfCatalog)
    assert [i.name for i in catalog.llm] == ["Mizan"]
    assert [i.name for i in catalog.tts] == ["Voice"]
    assert [i.url for i in catalog.datasets] == [
        "https://huggingface.co/datasets/AlicanKiraz0/Turkish-SFT-Dataset-v1.0"
    ]
