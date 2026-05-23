from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class GroupData(BaseModel):
    name: str
    teams: List[str]


class WorldCupData(BaseModel):
    year: str
    tournament_name: str
    groups: List[GroupData]
    teams: List[str]
    total_groups: int
    total_teams: int


class PredictRequest(BaseModel):
    wiki_url: str


class QuizAnswerRequest(BaseModel):
    question_id: str
    answer: str
